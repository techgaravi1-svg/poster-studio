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
    // Signature: folder (if any), public_id, timestamp
    const params = {
      folder: 'posters',
      public_id: publicId,
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
    addField('folder', 'posters');
    addField('public_id', publicId);
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

async function testSingle() {
  const url = 'postgres://fd93ae4e270290d6018e47884ac04b7f75bb2f8b62a464490246b78b74f06291:sk_6qYpH3csyfqvztglGVtFt@pooled.db.prisma.io:5432/postgres?sslmode=require&connect_timeout=30';
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  
  try {
    const prod = await prisma.product.findFirst({
      where: {
        images: { isEmpty: false }
      }
    });

    if (!prod || !prod.images[0]) {
      console.log('No product found');
      return;
    }

    console.log('Testing upload for product:', prod.title);
    const firstImg = prod.images[0];
    if (firstImg.startsWith('data:image')) {
      const secureUrl = await uploadToCloudinary(firstImg, `test_${prod.slug}`);
      console.log('SUCCESS! Uploaded to Cloudinary:');
      console.log(secureUrl);
    } else {
      console.log('Image is already a URL:', firstImg);
    }
  } catch (err) {
    console.error('Error in test:', err);
  } finally {
    await prisma.$disconnect();
  }
}

testSingle();

