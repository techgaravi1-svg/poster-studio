const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

const CLOUD_NAME = 'pyjyrmry';
const API_KEY = '848535755562423';
const API_SECRET = 'a7Z4E8P9dCbr0EuyIXpQEdMliZs';

function uploadFileToCloudinary(filePath, publicId) {
  return new Promise((resolve, reject) => {
    const timestamp = Math.floor(Date.now() / 1000);
    const cleanPublicId = publicId.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 80);
    const params = {
      folder: 'dungeons_store_assets',
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

// Pool helper
async function pool(items, concurrency, fn) {
  let index = 0;
  const results = [];
  const executing = [];

  for (const item of items) {
    const p = Promise.resolve().then(() => fn(item, index++));
    results.push(p);

    if (concurrency <= items.length) {
      const e = p.then(() => executing.splice(executing.indexOf(e), 1));
      executing.push(e);
      if (executing.length >= concurrency) {
        await Promise.race(executing);
      }
    }
  }
  return Promise.all(results);
}

function getFiles(dir, baseDir = dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFiles(fullPath, baseDir));
    } else {
      const ext = path.extname(file).toLowerCase();
      if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
        const relPath = '/' + path.relative(baseDir, fullPath).replace(/\\/g, '/');
        results.push({ fullPath, relPath, file });
      }
    }
  });
  return results;
}

async function start() {
  const publicDir = path.resolve(__dirname, '../artifacts/poster-studio/public');
  const allImages = getFiles(publicDir, publicDir);

  console.log(`Found ${allImages.length} images in public directory.`);

  const urlMap = {};
  const mapFile = path.resolve(__dirname, 'cloudinary_asset_map.json');
  if (fs.existsSync(mapFile)) {
    Object.assign(urlMap, JSON.parse(fs.readFileSync(mapFile, 'utf8')));
  }

  const toUpload = allImages.filter(img => !urlMap[img.relPath]);
  console.log(`${toUpload.length} images to upload to Cloudinary...`);

  let done = 0;
  await pool(toUpload, 6, async (img) => {
    try {
      const pubId = path.basename(img.file, path.extname(img.file)) + '_' + crypto.randomBytes(3).toString('hex');
      const cdnUrl = await uploadFileToCloudinary(img.fullPath, pubId);
      urlMap[img.relPath] = cdnUrl;
      done++;
      console.log(`[${done}/${toUpload.length}] Uploaded: ${img.relPath} -> ${cdnUrl}`);
      fs.writeFileSync(mapFile, JSON.stringify(urlMap, null, 2));
    } catch (err) {
      console.error(`Failed ${img.relPath}:`, err.message || err);
    }
  });

  console.log(`\nALL DONE! Uploaded ${done} assets. Map written to ${mapFile}`);
}

start();
