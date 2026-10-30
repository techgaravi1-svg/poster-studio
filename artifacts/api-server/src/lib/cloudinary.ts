import https from 'node:https';
import crypto from 'node:crypto';

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'pyjyrmry';
const API_KEY = process.env.CLOUDINARY_API_KEY || '848535755562423';
const API_SECRET = process.env.CLOUDINARY_API_SECRET || 'a7Z4E8P9dCbr0EuyIXpQEdMliZs';

export async function uploadBase64ToCloudinary(fileData: string, publicIdPrefix = 'poster'): Promise<string> {
  if (!fileData || typeof fileData !== 'string' || !fileData.startsWith('data:image')) {
    return fileData;
  }

  return new Promise((resolve) => {
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
                console.error('[Cloudinary] Upload failed with body:', body);
                resolve(fileData);
              }
            } catch {
              resolve(fileData);
            }
          });
        }
      );

      req.on('error', (err) => {
        console.error('[Cloudinary] Network error:', err);
        resolve(fileData);
      });

      req.write(payload);
      req.end();
    } catch (err) {
      console.error('[Cloudinary] Unexpected error:', err);
      resolve(fileData);
    }
  });
}
