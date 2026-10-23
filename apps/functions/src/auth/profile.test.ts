import { describe, expect, it } from 'vitest';

import { hasPasswordProvider } from './profile.js';

describe('hasPasswordProvider', () => {
  it('requires a Password provider for official invite acceptance', () => {
    expect(hasPasswordProvider([{ providerId: 'password' }])).toBe(true);
    expect(hasPasswordProvider([{ providerId: 'google.com' }])).toBe(false);
  });
});
