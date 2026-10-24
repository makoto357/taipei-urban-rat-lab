const JPEG_MAGIC = [0xff, 0xd8, 0xff] as const;
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;
const WEBP_MAGIC = Buffer.from('WEBP', 'ascii');
const RIFF_MAGIC = Buffer.from('RIFF', 'ascii');

export const MAX_IMAGE_PIXELS = 16_777_216;
export const MAX_IMAGE_EDGE = 2_048;
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const beginsWith = (bytes: Buffer, signature: readonly number[]): boolean =>
  signature.every((byte, index) => bytes[index] === byte);

export const detectSupportedImageType = (
  bytes: Buffer,
): 'image/jpeg' | 'image/png' | 'image/webp' | undefined => {
  if (beginsWith(bytes, JPEG_MAGIC)) return 'image/jpeg';
  if (beginsWith(bytes, PNG_MAGIC)) return 'image/png';
  if (bytes.subarray(0, 4).equals(RIFF_MAGIC) && bytes.subarray(8, 12).equals(WEBP_MAGIC)) {
    return 'image/webp';
  }
  return undefined;
};

export const isWithinPixelLimit = (width: number, height: number): boolean =>
  Number.isSafeInteger(width)
  && Number.isSafeInteger(height)
  && width > 0
  && height > 0
  && width * height <= MAX_IMAGE_PIXELS;

export const isWithinByteLimit = (bytes: number): boolean =>
  Number.isSafeInteger(bytes) && bytes >= 0 && bytes <= MAX_IMAGE_BYTES;
