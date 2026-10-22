import { Router, type Request, type Response } from 'express';
import { prisma } from '@workspace/db';

const router: Router = Router();

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

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'degraded',
    service: 'Dungeons Poster Studio API',
    database: {
      provider: 'Prisma PostgreSQL',
      status: dbStatus,
      latencyMs: dbLatency,
    },
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    responseDurationMs: Date.now() - startTime,
  });
});

export default router;
