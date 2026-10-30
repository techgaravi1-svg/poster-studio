const fs = require('fs');
const path = require('path');

const map = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'cloudinary_asset_map.json'), 'utf8'));

// Sort keys by length descending to replace specific paths before general ones
const keys = Object.keys(map).sort((a, b) => b.length - a.length);

const targetFiles = [
  path.resolve(__dirname, '../artifacts/poster-studio/src/lib/catalog.ts'),
  path.resolve(__dirname, '../artifacts/poster-studio/src/pages/store-pages.tsx'),
  path.resolve(__dirname, '../artifacts/poster-studio/src/pages/admin-page.tsx'),
  path.resolve(__dirname, '../artifacts/poster-studio/src/components/cart-order-ui.tsx'),
  path.resolve(__dirname, '../artifacts/poster-studio/src/components/storefront.tsx'),
];

targetFiles.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  let count = 0;
  keys.forEach(k => {
    // Escape regex
    const regex = new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    const matches = content.match(regex);
    if (matches) {
      count += matches.length;
      content = content.replace(regex, map[k]);
    }
  });
  fs.writeFileSync(file, content, 'utf8');
  console.log(`Updated ${path.basename(file)}: replaced ${count} asset references with Cloudinary URLs.`);
});

