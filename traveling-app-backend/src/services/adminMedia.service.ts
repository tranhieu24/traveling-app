import { randomUUID } from 'crypto';
import { supabaseAdmin } from '../config/supabase';
import { ENV } from '../config/env';
import { AppError } from '../types';
import { decodeAdminImage } from '../domain/adminMedia';

const BUCKET = 'admin-listing-images';
export async function uploadAdminMedia(base64: unknown, contentType: unknown) {
  const { bytes, extension } = decodeAdminImage(base64, contentType);
  if (!ENV.SUPABASE_URL || !ENV.SUPABASE_SERVICE_ROLE_KEY)
    throw new AppError('Image storage is not configured on the server', 503, 'STORAGE_UNAVAILABLE');
  const existing = await supabaseAdmin.storage.getBucket(BUCKET);
  if (existing.error) {
    if (String((existing.error as any).statusCode) !== '404')
      throw new AppError('Image storage is unavailable', 503, 'STORAGE_UNAVAILABLE');
    const created = await supabaseAdmin.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: 4 * 1024 * 1024,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    });
    if (created.error && !/already exists|duplicate/i.test(created.error.message))
      throw new AppError('Could not initialize image storage', 503, 'STORAGE_UNAVAILABLE');
  } else if (!existing.data.public) {
    throw new AppError(
      'The admin image bucket must be configured for public listing images',
      503,
      'STORAGE_UNAVAILABLE'
    );
  }
  const filename = `${randomUUID()}.${extension}`;
  const result = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(filename, bytes, { contentType: String(contentType), upsert: false });
  if (result.error)
    throw new AppError('Could not upload image. Please try again', 503, 'STORAGE_UNAVAILABLE');
  return {
    url: supabaseAdmin.storage.from(BUCKET).getPublicUrl(filename).data.publicUrl,
    iconName: `media:${filename}`,
  };
}
