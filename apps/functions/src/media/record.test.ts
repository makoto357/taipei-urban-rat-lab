import { describe, expect, it } from 'vitest';

import { isExpectedExistingMedia } from './record.js';

describe('isExpectedExistingMedia', () => {
  it('refuses to process a staging event that collides with another owner record', () => {
    expect(isExpectedExistingMedia(
      { ownerUid: 'other-user', storagePath: 'staging/other-user/media-1' },
      'owner-1',
      'staging/owner-1/media-1',
    )).toBe(false);
  });

  it('allows a first upload and idempotent processing of its matching record', () => {
    expect(isExpectedExistingMedia(undefined, 'owner-1', 'staging/owner-1/media-1')).toBe(true);
    expect(isExpectedExistingMedia(
      { ownerUid: 'owner-1', storagePath: 'staging/owner-1/media-1' },
      'owner-1',
      'staging/owner-1/media-1',
    )).toBe(true);
  });
});
