import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";
import { rm, mkdir, cp, writeFile } from "node:fs/promises";
import { existsSync, readdirSync } from "node:fs";

// Plugins (e.g. 'esbuild-plugin-pino') may use `require` to resolve dependencies
globalThis.require = createRequire(import.meta.url);

const artifactDir = path.dirname(fileURLToPath(import.meta.url));
// Workspace root = ../../ from artifacts/api-server/
const workspaceRoot = path.resolve(artifactDir, "../..");

const EXTERNALS = [
  "*.node",
  "sharp",
  "better-sqlite3",
  "sqlite3",
  "canvas",
  "bcrypt",
  "argon2",
  "fsevents",
  "re2",
  "farmhash",
  "xxhash-addon",
  "bufferutil",
  "utf-8-validate",
  "ssh2",
  "cpu-features",
  "dtrace-provider",
  "isolated-vm",
  "lightningcss",
  "pg-native",
  "oracledb",
  "mongodb-client-encryption",
  "nodemailer",
  "handlebars",
  "knex",
  "typeorm",
  "protobufjs",
  "onnxruntime-node",
  "@tensorflow/*",
  "@prisma/client",
  "@mikro-orm/*",
  "@grpc/*",
  "@swc/*",
  "@aws-sdk/*",
  "@azure/*",
  "@opentelemetry/*",
  "@google-cloud/*",
  "@google/*",
  "googleapis",
  "firebase-admin",
  "@parcel/watcher",
  "@sentry/profiling-node",
  "@tree-sitter/*",
  "aws-sdk",
  "classic-level",
  "dd-trace",
  "ffi-napi",
  "grpc",
  "hiredis",
  "kerberos",
  "leveldown",
  "miniflare",
  "mysql2",
  "newrelic",
  "odbc",
  "piscina",
  "realm",
  "ref-napi",
  "rocksdb",
  "sass-embedded",
  "sequelize",
  "serialport",
  "snappy",
  "tinypool",
  "usb",
  "workerd",
  "wrangler",
  "zeromq",
  "zeromq-prebuilt",
  "playwright",
  "puppeteer",
  "puppeteer-core",
  "electron",
];

async function buildAll() {
  // ────────────────────────────────────────────────────────────────────────────
  // 1. Build Node.js standalone server bundle (for local dev)
  // ────────────────────────────────────────────────────────────────────────────
  const distDir = path.resolve(artifactDir, "dist");
  await rm(distDir, { recursive: true, force: true });

  await esbuild({
    entryPoints: [path.resolve(artifactDir, "src/index.ts")],
    platform: "node",
    bundle: true,
    format: "esm",
    outdir: distDir,
    outExtension: { ".js": ".mjs" },
    logLevel: "info",
    external: EXTERNALS,
    sourcemap: "linked",
    banner: {
      js: `import { createRequire as __bannerCrReq } from 'node:module';
import __bannerPath from 'node:path';
import __bannerUrl from 'node:url';

globalThis.require = __bannerCrReq(import.meta.url);
globalThis.__filename = __bannerUrl.fileURLToPath(import.meta.url);
globalThis.__dirname = __bannerPath.dirname(globalThis.__filename);
    `,
    },
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 2. Build Vercel Build Output API structure in .vercel/output/
  //    See: https://vercel.com/docs/build-output-api/primitives
  //
  //    .vercel/output/
  //      config.json                   ← routing rules
  //      static/                       ← SPA static assets
  //      functions/
  //        api.func/                   ← serverless function served at /api/*
  //          index.js                  ← bundled CJS Express app
  //          .vc-config.json           ← Vercel runtime config
  //          node_modules/@prisma/     ← Prisma client (external, must be present)
  // ────────────────────────────────────────────────────────────────────────────
  const vercelOutput = path.resolve(workspaceRoot, ".vercel/output");
  const vercelStatic = path.resolve(vercelOutput, "static");
  const vercelFuncDir = path.resolve(vercelOutput, "functions/api.func");

  await rm(vercelOutput, { recursive: true, force: true });
  await mkdir(vercelStatic, { recursive: true });
  await mkdir(vercelFuncDir, { recursive: true });

  // 2a. Bundle Express API into .vercel/output/functions/api.func/index.js
  console.log("[vercel-build] Bundling serverless function...");
  await esbuild({
    entryPoints: [path.resolve(artifactDir, "src/serverless.ts")],
    platform: "node",
    target: "node20",
    bundle: true,
    format: "cjs",
    outfile: path.resolve(vercelFuncDir, "index.js"),
    logLevel: "info",
    external: ["*.node", "@prisma/client"],
  });

  // 2b. Write .vc-config.json — tells Vercel how to invoke the function
  await writeFile(
    path.resolve(vercelFuncDir, ".vc-config.json"),
    JSON.stringify(
      {
        runtime: "nodejs22.x",
        handler: "index.js",
        launcherType: "Nodejs",
        shouldAddHelpers: true,
        maxDuration: 30,
      },
      null,
      2
    ),
    "utf-8"
  );
  console.log("[vercel-build] Wrote .vc-config.json");

  // 2c. Copy @prisma/client and .prisma into the function directory so they are available at runtime.
  //     @prisma/client requires .prisma/client/default.js and the binary query engines.
  let copiedPrisma = false;
  let copiedGenerated = false;

  const pnpmRoot = path.resolve(workspaceRoot, "node_modules/.pnpm");
  if (existsSync(pnpmRoot)) {
    const pnpmDirs = readdirSync(pnpmRoot);
    for (const dir of pnpmDirs) {
      if (dir.startsWith("@prisma+client@")) {
        const clientCandidate = path.resolve(
          pnpmRoot,
          dir,
          "node_modules/@prisma/client"
        );
        const dotPrismaCandidate = path.resolve(
          pnpmRoot,
          dir,
          "node_modules/.prisma"
        );

        if (existsSync(clientCandidate)) {
          const dest = path.resolve(vercelFuncDir, "node_modules/@prisma/client");
          await mkdir(path.dirname(dest), { recursive: true });
          await cp(clientCandidate, dest, { recursive: true });
          console.log("[vercel-build] Copied @prisma/client into function directory");
          copiedPrisma = true;
        }

        if (existsSync(dotPrismaCandidate)) {
          const dest = path.resolve(vercelFuncDir, "node_modules/.prisma");
          await mkdir(dest, { recursive: true });
          await cp(dotPrismaCandidate, dest, { recursive: true });
          console.log("[vercel-build] Copied .prisma (with query engines) from .pnpm into function directory");
          copiedGenerated = true;
        }

        if (copiedPrisma && copiedGenerated) break;
      }
    }
  }

  // Fallback: check hoisted locations if not found in .pnpm
  if (!copiedGenerated) {
    const prismaGenerated = path.resolve(workspaceRoot, "node_modules/.prisma");
    if (existsSync(prismaGenerated)) {
      const dest = path.resolve(vercelFuncDir, "node_modules/.prisma");
      await mkdir(dest, { recursive: true });
      await cp(prismaGenerated, dest, { recursive: true });
      console.log("[vercel-build] Copied .prisma from workspaceRoot into function directory");
      copiedGenerated = true;
    }
  }

  if (!copiedPrisma) {
    const rootClient = path.resolve(workspaceRoot, "node_modules/@prisma/client");
    if (existsSync(rootClient)) {
      const dest = path.resolve(vercelFuncDir, "node_modules/@prisma/client");
      await mkdir(path.dirname(dest), { recursive: true });
      await cp(rootClient, dest, { recursive: true });
      console.log("[vercel-build] Copied @prisma/client from workspaceRoot into function directory");
      copiedPrisma = true;
    }
  }

  if (!copiedPrisma || !copiedGenerated) {
    console.warn(`[vercel-build] WARNING: Prisma files incomplete (client: ${copiedPrisma}, dotPrisma: ${copiedGenerated}) — API may fail to connect to database`);
  } else {
    console.log("[vercel-build] Successfully bundled Prisma runtime and generated client for Vercel!");
  }

  // 2d. Copy SPA static files into .vercel/output/static/
  const spaDistDir = path.resolve(workspaceRoot, "artifacts/poster-studio/dist");
  if (!existsSync(spaDistDir)) {
    throw new Error(
      `[vercel-build] SPA dist not found at ${spaDistDir}. Build poster-studio first.`
    );
  }
  await cp(spaDistDir, vercelStatic, { recursive: true });
  console.log("[vercel-build] Copied SPA static files to .vercel/output/static/");

  // 2e. Write routing config.json
  //     - /api and /api/* → serverless function
  //     - Static assets served by CDN
  //     - All other paths → index.html (SPA fallback)
  await writeFile(
    path.resolve(vercelOutput, "config.json"),
    JSON.stringify(
      {
        version: 3,
        routes: [
          // API routes → serverless function at /api.func/
          {
            src: "^/api(/.*)?$",
            dest: "/api",
          },
          // Static asset cache headers (hashed filenames from Vite)
          {
            src: "^/assets/(.+)$",
            headers: { "cache-control": "public, max-age=31536000, immutable" },
            continue: true,
          },
          // Let Vercel serve static files that exist
          {
            handle: "filesystem",
          },
          // SPA fallback — any unmatched path (excluding /api) gets index.html
          {
            src: "^/(?!api).*$",
            dest: "/index.html",
          },
        ],
      },
      null,
      2
    ),
    "utf-8"
  );

  console.log("[vercel-build] Done. .vercel/output/ is ready.");
  console.log("  static/ :", vercelStatic);
  console.log("  api.func/:", vercelFuncDir);
}

buildAll().catch((err) => {
  console.error("[vercel-build] FATAL:", err);
  process.exit(1);
});
