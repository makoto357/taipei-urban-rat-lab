import { HttpsError } from 'firebase-functions/v2/https';
import type { CallableRequest } from 'firebase-functions/v2/https';

export const isRecentAuthentication = (
  authTime: unknown,
  nowSeconds: number,
  maximumAgeSeconds: number,
): boolean =>
  typeof authTime === 'number'
  && Number.isSafeInteger(authTime)
  && authTime <= nowSeconds
  && nowSeconds - authTime <= maximumAgeSeconds;

const maxAdminReauthenticationAge = (): number => {
  const configured = Number(process.env.ADMIN_MAX_REAUTH_AGE_SECONDS);
  if (!Number.isSafeInteger(configured) || configured <= 0) {
    throw new HttpsError(
      'failed-precondition',
      'ADMIN_MAX_REAUTH_AGE_SECONDS must be configured before high-privilege operations are enabled.',
    );
  }
  return configured;
};

export const requireAdmin = (request: CallableRequest<unknown>): string => {
  if (request.auth === undefined || request.auth.token.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Administrator access is required.');
  }
  if (!isRecentAuthentication(
    request.auth.token.auth_time,
    Math.floor(Date.now() / 1_000),
    maxAdminReauthenticationAge(),
  )) {
    throw new HttpsError('permission-denied', 'A recent authentication is required.');
  }
  return request.auth.uid;
};

/**
 * Routine fieldwork writes (調查/投藥/採樣 events) require an active official
 * or admin token, but — unlike requireAdmin — not a recent re-authentication;
 * plan.md only calls out recent re-auth for high-privilege admin operations.
 */
export const requireOfficialOrAdmin = (request: CallableRequest<unknown>): string => {
  const role = request.auth?.token.role;
  if (request.auth === undefined || (role !== 'official' && role !== 'admin')) {
    throw new HttpsError('permission-denied', 'Official access is required.');
  }
  return request.auth.uid;
};
