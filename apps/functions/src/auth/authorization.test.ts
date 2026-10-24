import { describe, expect, it } from 'vitest';

import { isRecentAuthentication } from './authorization.js';

describe('isRecentAuthentication', () => {
  it('accepts auth_time values within the configured reauthentication window', () => {
    expect(isRecentAuthentication(1_000, 1_299, 300)).toBe(true);
  });

  it('rejects expired or malformed auth_time values', () => {
    expect(isRecentAuthentication(1_000, 1_301, 300)).toBe(false);
    expect(isRecentAuthentication(undefined, 1_100, 300)).toBe(false);
  });
});
