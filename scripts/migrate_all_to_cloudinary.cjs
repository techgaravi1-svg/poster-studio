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

// Concurrency pool helper
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

async function migrateAll() {
  const url = 'postgres://fd93ae4e270290d6018e47884ac04b7f75bb2f8b62a464490246b78b74f06291:sk_6qYpH3csyfqvztglGVtFt@pooled.db.prisma.io:5432/postgres?sslmode=require&connect_timeout=60';
  const prisma = new PrismaClient({ datasources: { db: { url } } });

  try {
    console.log('Fetching products from database...');
    const products = await prisma.product.findMany();
    const needsMigration = products.filter(p => p.images && p.images.some(img => img.startsWith('data:image')));

    console.log(`Found ${products.length} total products. ${needsMigration.length} need migration from base64 to Cloudinary.`);

    if (needsMigration.length === 0) {
      console.log('All products already have clean URLs!');
      return;
    }

    let completed = 0;
    let failed = 0;

    await pool(needsMigration, 6, async (product, idx) => {
      try {
        const newImages = [];
        for (let i = 0; i < product.images.length; i++) {
          const img = product.images[i];
          if (img.startsWith('data:image')) {
            const pubId = `${product.slug || product.id}_img${i}`;
            const cdnUrl = await uploadToCloudinary(img, pubId);
            newImages.push(cdnUrl);
          } else {
            newImages.push(img);
          }
        }

        await prisma.product.update({
          where: { id: product.id },
          data: { images: newImages },
        });

        completed++;
        if (completed % 10 === 0 || completed === needsMigration.length) {
          console.log(`[${completed}/${needsMigration.length}] Migrated: "${product.title}"`);
        }
      } catch (err) {
        failed++;
        console.error(`Failed on product [${product.id}] "${product.title}":`, err.message || err);
      }
    });

    console.log(`\nMigration completed! Successfully migrated: ${completed}, Failed: ${failed}`);
  } catch (err) {
    console.error('Fatal error during migration:', err);
  } finally {
    await prisma.$disconnect();
  }
}

migrateAll();

