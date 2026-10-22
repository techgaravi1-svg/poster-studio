import 'dotenv/config';
import app from './app';
import { logger } from './lib/logger';
import { prisma } from '@workspace/db';

const rawPort = process.env.PORT || '5000';
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = app.listen(port, async () => {
  logger.info({ port }, '🚀 Dungeons API Server listening');

  // Verify Prisma database connectivity
  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.info('✅ Prisma PostgreSQL database connected successfully');
  } catch (err) {
    logger.error({ err }, '⚠️ Warning: Could not connect to database on startup');
  }
});

// Graceful Shutdown Handlers to close DB connection pool cleanly
const shutdown = async (signal: string) => {
  logger.info({ signal }, 'Shutting down gracefully...');
  server.close(async () => {
    logger.info('HTTP server closed.');
    await prisma.$disconnect();
    logger.info('Prisma database disconnected.');
    process.exit(0);
  });

  // Force exit after 10s if graceful shutdown hangs
  setTimeout(() => {
    logger.error('Forcefully exiting due to timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
