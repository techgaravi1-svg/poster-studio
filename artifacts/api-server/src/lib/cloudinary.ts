import https from 'node:https';
import crypto from 'node:crypto';

// Credentials should come from the environment (CLOUDINARY_* in Vercel).
// The fallbacks keep the live admin image uploads working exactly as before
// until those env vars are set. They were already public in git history:
// rotate the Cloudinary secret, set the env vars, then delete these fallbacks.
const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'pyjyrmry';
const API_KEY = process.env.CLOUDINARY_API_KEY || '848535755562423';
const API_SECRET = process.env.CLOUDINARY_API_SECRET || 'a7Z4E8P9dCbr0EuyIXpQEdMliZs';

/** True when the credentials come from env vars rather than the legacy fallbacks. */
export function cloudinaryUsingEnv(): boolean {
  return Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
}

export function cloudinaryConfigured(): boolean {
  return Boolean(CLOUD_NAME && API_KEY && API_SECRET);
}

const ALLOWED_IMAGE_PREFIX = /^data:image\/(png|jpe?g|webp|gif|avif);base64,/i;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB decoded

/** True for an https URL or an allowed base64 image data URI under the size cap. */
export function isAcceptableImageInput(value: string): boolean {
  if (typeof value !== 'string') return false;
  if (/^https:\/\/[^\s]+$/i.test(value)) return value.length <= 2048;
  if (!ALLOWED_IMAGE_PREFIX.test(value)) return false;
  const base64Len = value.length - value.indexOf(',') - 1;
  return base64Len * 0.75 <= MAX_IMAGE_BYTES;
}

/**
 * Uploads a base64 image to Cloudinary and returns its CDN URL.
 * Non-data-URI values (already-hosted URLs) are returned unchanged.
 * Throws if the upload fails, so raw base64 blobs never end up in the database.
 */
export async function uploadBase64ToCloudinary(fileData: string, publicIdPrefix = 'poster'): Promise<string> {
  if (!fileData || typeof fileData !== 'string' || !fileData.startsWith('data:image')) {
    return fileData;
  }
  if (!cloudinaryConfigured()) {
    throw new Error('Image uploads are not configured on the server (CLOUDINARY_* env vars missing).');
  }

  return new Promise((resolve, reject) => {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const cleanPublicId = `${publicIdPrefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`.replace(/[^a-zA-Z0-9_-]/g, '_');
      const params: Record<string, any> = {
        folder: 'dungeons_posters',
        public_id: cleanPublicId,
        timestamp,
      };

      const toSign = Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join('&') + API_SECRET;
      const signature = crypto.createHash('sha1').update(toSign).digest('hex');

      const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
      let payload = '';

      const addField = (name: string, val: any) => {
        payload += `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${val}\r\n`;
      };

      addField('file', fileData);
      addField('api_key', API_KEY);
      addField('timestamp', timestamp);
      addField('folder', 'dungeons_posters');
      addField('public_id', cleanPublicId);
      addField('signature', signature);
      payload += `--${boundary}--\r\n`;

      const req = https.request(
        {
          hostname: 'api.cloudinary.com',
          path: `/v1_1/${CLOUD_NAME}/image/upload`,
          method: 'POST',
          headers: {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Content-Length': Buffer.byteLength(payload),
          },
        },
        (res) => {
          let body = '';
          res.on('data', (chunk) => (body += chunk));
          res.on('end', () => {
            try {
              const json = JSON.parse(body);
              if (json.secure_url) {
                resolve(json.secure_url);
              } else {
                console.error('[Cloudinary] Upload failed with status', res.statusCode);
                reject(new Error('Image upload failed. Please try a different image.'));
              }
            } catch {
              reject(new Error('Image upload failed. Please try again.'));
            }
          });
        }
      );

      req.on('error', (err) => {
        console.error('[Cloudinary] Network error:', err.message);
        reject(new Error('Image upload service unreachable. Please try again.'));
      });

      req.write(payload);
      req.end();
    } catch (err) {
      reject(err instanceof Error ? err : new Error('Image upload failed.'));
    }
  });
}

