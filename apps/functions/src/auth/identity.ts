import { HttpsError } from 'firebase-functions/v2/https';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

export const normalizeEmail = (email: string): string => {
  const normalized = email.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(normalized)) {
    throw new HttpsError('invalid-argument', 'A complete email address is required.');
  }
  return normalized;
};

export const emailDomain = (emailNormalized: string): string => {
  const separator = emailNormalized.lastIndexOf('@');
  if (separator <= 0 || separator === emailNormalized.length - 1) {
    throw new HttpsError('invalid-argument', 'A complete email address is required.');
  }
  return emailNormalized.slice(separator + 1);
};

export const parseAllowedOfficialDomains = (rawDomains: string | undefined): Set<string> => {
  if (rawDomains === undefined) return new Set();

  return new Set(
    rawDomains
      .split(',')
      .map((domain) => domain.trim().toLowerCase())
      .filter((domain) => domain.length > 0),
  );
};

export const allowedOfficialDomains = (): Set<string> =>
  parseAllowedOfficialDomains(process.env.OFFICIAL_EMAIL_DOMAINS);
