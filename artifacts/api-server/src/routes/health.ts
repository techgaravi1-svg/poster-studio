import { Router, type Request, type Response } from 'express';
import { prisma } from '@workspace/db';
import { razorpayConfigured, razorpayKeyId } from '../lib/razorpay';
import { cloudinaryUsingEnv } from '../lib/cloudinary';

const router: Router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'online',
    service: 'Dungeons Poster Studio Backend API',
    database: 'Prisma PostgreSQL',
    endpoints: ['/api/products', '/api/orders', '/api/coupons', '/api/healthz'],
    timestamp: new Date().toISOString(),
  });
});

/**
 * Health check endpoint: verifies API server and Prisma PostgreSQL database connection.
 * Never leaks credentials or sensitive internal stack details.
 */
router.get('/healthz', async (_req: Request, res: Response) => {
  const startTime = Date.now();
  let dbStatus = 'disconnected';
  let dbLatency = 0;

  try {
    // Run minimal ping to verify PostgreSQL pool responsiveness
    const dbPingStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatency = Date.now() - dbPingStart;
    dbStatus = 'connected';
  } catch (error: any) {
    dbStatus = 'unreachable';
  }

  const isHealthy = dbStatus === 'connected';

  // Deployment readiness (no secrets): has the marketplace schema been pushed,
  // and are server-side payments configured?
  let marketplaceSchema = 'unknown';
  if (isHealthy) {
    try {
      const rows = await prisma.$queryRaw<Array<{ sellers: string | null; approval: number }>>`
        SELECT to_regclass('public.sellers')::text AS sellers,
               (SELECT count(*)::int FROM information_schema.columns
                 WHERE table_name = 'products' AND column_name = 'approvalStatus') AS approval`;
      marketplaceSchema = rows[0]?.sellers && rows[0]?.approval ? 'ready' : 'missing (run prisma db push)';
    } catch {
      marketplaceSchema = 'unknown';
    }
  }
  const keyId = razorpayKeyId();

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'degraded',
    service: 'Dungeons Poster Studio API',
    database: {
      provider: 'Prisma PostgreSQL',
      status: dbStatus,
      latencyMs: dbLatency,
    },
    readiness: {
      marketplaceSchema,
      payments: razorpayConfigured() ? `configured (${keyId.startsWith('rzp_live') ? 'LIVE' : 'TEST'} mode)` : 'missing RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET',
      imageUploads: cloudinaryUsingEnv() ? 'env vars' : 'legacy fallback (set CLOUDINARY_* env vars)',
    },
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    responseDurationMs: Date.now() - startTime,
  });
});

export default router;
