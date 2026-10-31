const path = require('path');
const https = require('https');
const crypto = require('crypto');
const { PrismaClient } = require(path.resolve(__dirname, '../lib/db/node_modules/@prisma/client'));
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const CLOUD_NAME = 'pyjyrmry';
const API_KEY = '848535755562423';
const API_SECRET = 'a7Z4E8P9dCbr0EuyIXpQEdMliZs';

function uploadToCloudinary(fileData, publicId) {
  return new Promise((resolve, reject) => {
    const timestamp = Math.floor(Date.now() / 1000);
    const cleanPublicId = publicId.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 80);
    const params = {
      folder: 'dungeons_posters',
      public_id: cleanPublicId,
      timestamp: timestamp,
    };
    
    const sortedKeys = Object.keys(params).sort();
    const toSign = sortedKeys.map(k => `${k}=${params[k]}`).join('&') + API_SECRET;
    const signature = crypto.createHash('sha1').update(toSign).digest('hex');

    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    let payload = '';

    const addField = (name, val) => {
      payload += `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${val}\r\n`;
    };

    addField('file', fileData);
    addField('api_key', API_KEY);
    addField('timestamp', timestamp);
    addField('folder', 'dungeons_posters');
    addField('public_id', cleanPublicId);
    addField('signature', signature);
    payload += `--${boundary}--\r\n`;

    const req = https.request({
      hostname: 'api.cloudinary.com',
      path: `/v1_1/${CLOUD_NAME}/image/upload`,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': Buffer.byteLength(payload)
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
    req.write(payload);
    req.end();
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function migrateRemaining() {
  const url = 'postgres://fd93ae4e270290d6018e47884ac04b7f75bb2f8b62a464490246b78b74f06291:sk_6qYpH3csyfqvztglGVtFt@pooled.db.prisma.io:5432/postgres?sslmode=require&connect_timeout=60&pool_timeout=60';
  let prisma = new PrismaClient({ datasources: { db: { url } } });

  try {
    const allMeta = await prisma.product.findMany({
      select: { id: true, slug: true, title: true },
      orderBy: { id: 'asc' },
    });

    console.log(`Checking ${allMeta.length} total products for base64 images...`);

    let migrated = 0;
    let clean = 0;
    let failed = 0;

    for (let i = 0; i < allMeta.length; i++) {
      const meta = allMeta[i];
      let p = null;
      let retries = 3;

      while (retries > 0) {
        try {
          p = await prisma.product.findUnique({
            where: { id: meta.id },
            select: { id: true, slug: true, title: true, images: true },
          });
          break;
        } catch (err) {
          retries--;
          console.warn(`Retry fetching product ${meta.id}: ${err.message}`);
          await prisma.$disconnect().catch(() => {});
          await sleep(1500);
          prisma = new PrismaClient({ datasources: { db: { url } } });
        }
      }

      if (!p) continue;

      const hasBase64 = p.images && p.images.some(img => img.startsWith('data:image'));
      if (!hasBase64) {
        clean++;
        continue;
      }

      console.log(`[${i + 1}/${allMeta.length}] Migrating: "${p.title}"...`);
      try {
        const newImages = [];
        for (let imgIdx = 0; imgIdx < p.images.length; imgIdx++) {
          const img = p.images[imgIdx];
          if (img.startsWith('data:image')) {
            const pubId = `${p.slug || p.id}_img${imgIdx}_${Date.now().toString().slice(-4)}`;
            const cdnUrl = await uploadToCloudinary(img, pubId);
            newImages.push(cdnUrl);
          } else {
            newImages.push(img);
          }
        }

        let updateRetries = 3;
        while (updateRetries > 0) {
          try {
            await prisma.product.update({
              where: { id: p.id },
              data: { images: newImages },
            });
            break;
          } catch (updateErr) {
            updateRetries--;
            console.warn(`Retry updating product ${p.id}: ${updateErr.message}`);
            await prisma.$disconnect().catch(() => {});
            await sleep(1500);
            prisma = new PrismaClient({ datasources: { db: { url } } });
          }
        }

        migrated++;
        console.log(`✓ Migrated (${migrated}): "${p.title}"`);
      } catch (err) {
        failed++;
        console.error(`✗ Failed "${p.title}":`, err.message);
      }
    }

    console.log(`\n=== Migration Complete ===`);
    console.log(`Clean: ${clean}, Migrated: ${migrated}, Failed: ${failed}`);
  } catch (err) {
    console.error('Fatal error:', err);
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

migrateRemaining();
