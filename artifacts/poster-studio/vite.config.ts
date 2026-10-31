import fs from 'fs';
import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';

const rawPort = process.env.PORT || '3000';
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH || '/';

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    {
      name: 'local-api-dev-middleware',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url && (req.url === '/ai-catalog.json' || req.url.startsWith('/ai-catalog.json?'))) {
            try {
              const aiPath = path.resolve(import.meta.dirname, 'public/ai-catalog.json');
              const content = fs.readFileSync(aiPath, 'utf8');
              res.setHeader('Content-Type', 'application/json');
              res.end(content);
              return;
            } catch {}
          }
          if (req.url && (req.url === '/llms.txt' || req.url.startsWith('/llms.txt?'))) {
            try {
              const llmsPath = path.resolve(import.meta.dirname, 'public/llms.txt');
              const content = fs.readFileSync(llmsPath, 'utf8');
              res.setHeader('Content-Type', 'text/plain; charset=utf-8');
              res.end(content);
              return;
            } catch {}
          }
          if (req.url && req.url.startsWith('/api/products')) {
            try {
              const fullDbPath = path.resolve(import.meta.dirname, 'src/lib/catalog-full-db.json');
              const rawData = fs.readFileSync(fullDbPath, 'utf8');
              const products = JSON.parse(rawData);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, count: products.length, products }));
              return;
            } catch (err) {
              // fallback to next
            }
          }
          if (req.url && req.url.startsWith('/api/coupons')) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              success: true,
              coupons: [
                { id: 'cp-1', code: 'STUDIO10', discountType: 'PERCENTAGE', discountValue: 10, minSpend: 299, active: true },
                { id: 'cp-2', code: 'DUNGEONS3', discountType: 'PERCENTAGE', discountValue: 15, minSpend: 399, active: true },
                { id: 'cp-3', code: 'FIRST10', discountType: 'PERCENTAGE', discountValue: 10, minSpend: 199, active: true },
                { id: 'cp-4', code: 'POSTER5', discountType: 'PERCENTAGE', discountValue: 5, minSpend: 99, active: true },
              ],
            }));
            return;
          }
          if (req.url && req.url.startsWith('/api/admin/')) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, count: 0, orders: [], products: [], subscribers: [] }));
            return;
          }
          next();
        });
      },
    },
    ...(process.env.NODE_ENV !== 'production' &&
    process.env.REPL_ID !== undefined
      ? [
          await import('@replit/vite-plugin-cartographer').then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, '..'),
            }),
          ),
          await import('@replit/vite-plugin-dev-banner').then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@assets': path.resolve(
        import.meta.dirname,
        '..',
        '..',
        'attached_assets',
      ),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(import.meta.dirname),
  envDir: path.resolve(import.meta.dirname, '../..'),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-icons': ['lucide-react'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    fs: {
      strict: true,
    },
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('error', (_err, _req, res: any) => {
            if (!res.headersSent && typeof res.writeHead === 'function') {
              res.writeHead(503, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, message: 'Backend API offline, using local database cache' }));
            }
          });
        },
      },
    },
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
