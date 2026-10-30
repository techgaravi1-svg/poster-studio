const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

const CLOUD_NAME = 'pyjyrmry';
const API_KEY = '848535755562423';
const API_SECRET = 'a7Z4E8P9dCbr0EuyIXpQEdMliZs';

function uploadFile(filePath, publicId) {
  return new Promise((resolve, reject) => {
    const timestamp = Math.floor(Date.now() / 1000);
    const cleanPublicId = publicId.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 80);
    const params = {
      folder: 'dungeons_hero_assets',
      public_id: cleanPublicId,
      timestamp: timestamp,
    };

    const sortedKeys = Object.keys(params).sort();
    const toSign = sortedKeys.map(k => `${k}=${params[k]}`).join('&') + API_SECRET;
    const signature = crypto.createHash('sha1').update(toSign).digest('hex');

    const fileBuffer = fs.readFileSync(filePath);
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    
    const prePayload = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="api_key"\r\n\r\n${API_KEY}\r\n` +
      `--${boundary}\r\nContent-Disposition: form-data; name="timestamp"\r\n\r\n${timestamp}\r\n` +
      `--${boundary}\r\nContent-Disposition: form-data; name="folder"\r\n\r\n${params.folder}\r\n` +
      `--${boundary}\r\nContent-Disposition: form-data; name="public_id"\r\n\r\n${cleanPublicId}\r\n` +
      `--${boundary}\r\nContent-Disposition: form-data; name="signature"\r\n\r\n${signature}\r\n` +
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${path.basename(filePath)}"\r\nContent-Type: image/jpeg\r\n\r\n`
    );
    const postPayload = Buffer.from(`\r\n--${boundary}--\r\n`);
    const totalLength = prePayload.length + fileBuffer.length + postPayload.length;

    const req = https.request({
      hostname: 'api.cloudinary.com',
      path: `/v1_1/${CLOUD_NAME}/image/upload`,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': totalLength,
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (json.secure_url) {
            resolve(json.secure_url);
          } else {
            reject(new Error(body));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(prePayload);
    req.write(fileBuffer);
    req.write(postPayload);
    req.end();
  });
}

async function run() {
  const items = [
    { file: 'artifacts/poster-studio/public/assets/custom-photobooth-new.jpg', id: 'photobooth_strip_new' },
    { file: 'artifacts/poster-studio/public/assets/dungeons-splash-logo.jpg', id: 'dungeons_splash_logo' },
    { file: 'artifacts/poster-studio/public/assets/Hero/hero1.jpeg', id: 'hero_slide_1' },
    { file: 'artifacts/poster-studio/public/assets/Hero/hero2.jpeg', id: 'hero_slide_2' },
    { file: 'artifacts/poster-studio/public/assets/Hero/hero3.jpeg', id: 'hero_slide_3' },
  ];

  const results = {};
  for (const item of items) {
    const fullPath = path.resolve(__dirname, '..', item.file);
    if (!fs.existsSync(fullPath)) {
      console.error('File not found:', fullPath);
      continue;
    }
    console.log(`Uploading ${item.file}...`);
    try {
      const url = await uploadFile(fullPath, item.id);
      results[item.id] = url;
      console.log(`Uploaded ${item.id} -> ${url}`);
    } catch (e) {
      console.error(`Failed ${item.id}:`, e.message || e);
    }
  }

  fs.writeFileSync(path.resolve(__dirname, 'new_hero_urls.json'), JSON.stringify(results, null, 2));
  console.log('Done! Saved to new_hero_urls.json');
}

run();
