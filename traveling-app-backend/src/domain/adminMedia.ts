import { AppError } from '../types';

export function decodeAdminImage(
  base64: unknown,
  contentType: unknown
): { bytes: Buffer; extension: string } {
  const supported: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };
  if (
    typeof base64 !== 'string' ||
    typeof contentType !== 'string' ||
    !supported[contentType] ||
    !base64.length ||
    base64.length > 5592408 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)
  ) {
    throw new AppError('Select a JPG, PNG or WebP image up to 4 MB', 400, 'INVALID_IMAGE');
  }
  const bytes = Buffer.from(base64, 'base64');
  if (!bytes.length || bytes.length > 4 * 1024 * 1024 || bytes.toString('base64') !== base64)
    throw new AppError('Invalid image encoding or size', 400, 'INVALID_IMAGE');
  const valid =
    contentType === 'image/png'
      ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : contentType === 'image/jpeg'
        ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
        : bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
  if (!valid)
    throw new AppError('Image content does not match its file type', 400, 'INVALID_IMAGE');
  return { bytes, extension: supported[contentType] };
}
