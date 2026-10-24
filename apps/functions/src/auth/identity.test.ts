import { describe, expect, it } from 'vitest';

import { normalizeEmail, parseAllowedOfficialDomains } from './identity.js';

describe('normalizeEmail', () => {
  it('normalizes whitespace and the entire email address to lower case', () => {
    expect(normalizeEmail('  Official.User@Gov.Taipei  ')).toBe('official.user@gov.taipei');
  });

  it('rejects malformed email addresses instead of extracting a partial domain', () => {
    expect(() => normalizeEmail('official@gov.taipei@invalid')).toThrow('email');
  });
});

describe('parseAllowedOfficialDomains', () => {
  it('normalizes and deduplicates complete allowlisted domains', () => {
    expect(parseAllowedOfficialDomains(' GOV.TAIPEI,health.gov.taipei,gov.taipei ')).toEqual(
      new Set(['gov.taipei', 'health.gov.taipei']),
    );
  });
});
