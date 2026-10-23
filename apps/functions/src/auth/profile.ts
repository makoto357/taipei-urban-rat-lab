import type { AuthProvider, UserProfile } from '@taipei-rat-lab/contracts';
import type { UserRecord } from 'firebase-admin/auth';
import { Timestamp } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';

import { normalizeEmail } from './identity.js';

const isAuthProvider = (providerId: string): providerId is AuthProvider =>
  providerId === 'password' || providerId === 'google.com';

export const hasPasswordProvider = (providers: ReadonlyArray<{ providerId: string }>): boolean =>
  providers.some(({ providerId }) => providerId === 'password');

export const syncedUserProfile = (
  user: UserRecord,
  existing: UserProfile | undefined,
  role: UserProfile['role'],
  status: UserProfile['status'],
  now: Timestamp,
): UserProfile => {
  if (existing !== undefined) {
    return {
      ...existing,
      role,
      status,
      emailVerified: user.emailVerified,
      updatedAt: now,
    };
  }

  if (user.email === undefined) {
    throw new HttpsError('failed-precondition', 'An email-backed user profile is required.');
  }
  const authProviders = user.providerData.map(({ providerId }) => providerId);
  if (authProviders.length === 0 || !authProviders.every(isAuthProvider)) {
    throw new HttpsError('failed-precondition', 'This sign-in provider is not eligible for an official account.');
  }

  return {
    role,
    status,
    displayName: user.displayName ?? '',
    emailNormalized: normalizeEmail(user.email),
    emailVerified: user.emailVerified,
    authProviders,
    createdAt: now,
    updatedAt: now,
    schemaVersion: 1,
  };
};
