import { describe, expect, it } from 'vitest';

import { detectSupportedImageType, isWithinByteLimit, isWithinPixelLimit } from './image.js';

describe('detectSupportedImageType', () => {
  it('accepts JPEG, PNG, and WebP by magic bytes rather than an object MIME type', () => {
    expect(detectSupportedImageType(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
    expect(detectSupportedImageType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe('image/png');
    expect(detectSupportedImageType(Buffer.from('RIFF____WEBP', 'ascii'))).toBe('image/webp');
  });

  it('rejects bytes that only claim to be images', () => {
    expect(detectSupportedImageType(Buffer.from('not an image'))).toBeUndefined();
  });
});

describe('isWithinPixelLimit', () => {
  it('rejects image dimensions that exceed the decoding pixel limit', () => {
    expect(isWithinPixelLimit(2_048, 2_048)).toBe(true);
    expect(isWithinPixelLimit(10_000, 10_000)).toBe(false);
  });
});

describe('isWithinByteLimit', () => {
  it('rejects storage events above the 8 MiB upload hard limit before decoding', () => {
    expect(isWithinByteLimit(8 * 1024 * 1024)).toBe(true);
    expect(isWithinByteLimit(8 * 1024 * 1024 + 1)).toBe(false);
  });
});
