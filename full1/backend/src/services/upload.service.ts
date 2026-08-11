import { Readable } from 'stream';
import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { cloudinary } from '../config/cloudinary';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';

const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

/** True when real Cloudinary credentials are configured in the environment. */
function isCloudinaryConfigured(): boolean {
  return Boolean(env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret);
}

/** Extracts the Cloudinary public id (folder included) from a secure URL. */
export function publicIdFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!/res\.cloudinary\.com$/i.test(parsed.hostname) && !/cloudinary\.com$/i.test(parsed.hostname)) {
      return null;
    }
    const segments = parsed.pathname.split('/').filter(Boolean);
    const versionIndex = segments.findIndex((segment) => /^v\d+$/.test(segment));
    const start = versionIndex >= 0 ? versionIndex + 1 : 1; // skip /image/upload
    const id = segments.slice(start).join('/').replace(/\.[a-zA-Z0-9]+$/, '');
    return id || null;
  } catch {
    return null;
  }
}

/** Resolves a local /uploads/... URL to a file on disk, or null. */
export function localPathFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!parsed.pathname.startsWith('/uploads/')) return null;
    const relative = parsed.pathname.slice('/uploads/'.length);
    const resolved = path.resolve(UPLOADS_DIR, relative);
    if (!resolved.startsWith(UPLOADS_DIR + path.sep) && resolved !== UPLOADS_DIR) return null;
    return resolved;
  } catch {
    return null;
  }
}

/**
 * Appends Cloudinary transformations (width / quality / auto format) to an
 * image URL for responsive, compressed delivery. Returns the input unchanged
 * when the URL is not hosted on Cloudinary.
 */
export function cloudinaryTransform(url: string, options: { w?: number; q?: number } = {}): string {
  try {
    const parsed = new URL(url);
    if (!/res\.cloudinary\.com$/i.test(parsed.hostname) && !/cloudinary\.com$/i.test(parsed.hostname)) {
      return url;
    }
    const pathname = parsed.pathname;
    const marker = '/image/upload/';
    const markerIndex = pathname.indexOf(marker);
    if (markerIndex === -1) return url;

    const transformations = [
      options.w ? `w_${Math.round(options.w)}` : '',
      options.q ? `q_${Math.round(options.q)}` : 'q_auto',
      'f_auto',
    ].filter(Boolean);
    const inserted = `${marker}${transformations.join(',')}/`;

    parsed.pathname = pathname.slice(0, markerIndex) + inserted + pathname.slice(markerIndex + marker.length);
    return parsed.toString();
  } catch {
    return url;
  }
}

function extensionFromName(name?: string): string {
  const ext = name?.match(/\.([a-zA-Z0-9]+)$/)?.[1];
  if (ext && /^(png|jpe?g|webp|gif|avif)$/i.test(ext)) {
    return `.${ext.toLowerCase().replace('jpeg', 'jpg')}`;
  }
  return '.png';
}

export const uploadService = {
  /**
   * Uploads a single image buffer (e.g. from multer memoryStorage).
   * Uses Cloudinary when credentials are configured; otherwise falls back to
   * saving the file locally under backend/uploads and serving it via /uploads.
   */
  async uploadImageBuffer(
    buffer: Buffer,
    folder = 'triplora/destinations',
    options: { baseUrl?: string; originalName?: string } = {},
  ): Promise<string> {
    if (isCloudinaryConfigured()) {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder, resource_type: 'image' },
          (error, result) => {
            if (error || !result) {
              reject(ApiError.internal('Image upload failed'));
              return;
            }
            resolve(result.secure_url);
          },
        );

        Readable.from(buffer).pipe(uploadStream);
      });
    }

    const dir = path.join(UPLOADS_DIR, folder);
    fs.mkdirSync(dir, { recursive: true });
    const filename = `${Date.now()}-${randomBytes(4).toString('hex')}${extensionFromName(options.originalName)}`;
    fs.writeFileSync(path.join(dir, filename), buffer);
    const baseUrl = options.baseUrl ?? `http://localhost:${env.port}`;
    return `${baseUrl.replace(/\/$/, '')}/uploads/${folder}/${filename}`;
  },

  /**
   * Deletes an image (Cloudinary asset or local file). Resolves to false when
   * the URL is not a managed asset (nothing to delete) or deletion failed, so
   * callers can safely ignore the outcome.
   */
  async deleteImage(url: string | null | undefined): Promise<boolean> {
    if (!url) return false;

    const localPath = localPathFromUrl(url);
    if (localPath) {
      try {
        fs.unlinkSync(localPath);
        return true;
      } catch (err) {
        console.error(`[uploads] delete failed for ${url}: ${err instanceof Error ? err.message : err}`);
        return false;
      }
    }

    const publicId = publicIdFromUrl(url);
    if (!publicId) return false;
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result?.result === 'ok' || result?.result === 'not found';
    } catch (err) {
      console.error(`[cloudinary] delete failed for ${publicId}: ${err instanceof Error ? err.message : err}`);
      return false;
    }
  },
};
