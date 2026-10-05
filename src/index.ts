import 'dotenv/config';
import { createApp } from './server/app.js';
import { prisma } from './db/prisma.js';

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const app = createApp();

const server = app.listen(port, () => {
  console.log(`[Manova Labs] Server running on http://localhost:${port}`);
  console.log(`[Manova Labs] Operational health: http://localhost:${port}/health`);
  console.log(`[Manova Labs] Researcher API: http://localhost:${port}/api/v1/experiments`);
});

let isShuttingDown = false;

async function gracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`[Manova Labs] Received ${signal}. Starting graceful shutdown...`);

  const forceExitTimeout = setTimeout(() => {
    console.error('[Manova Labs] Forceful shutdown timeout exceeded. Exiting process.');
    process.exit(1);
  }, 10000);
  forceExitTimeout.unref();

  server.close(async (err) => {
    if (err) {
      console.error('[Manova Labs] Error closing HTTP server:', err);
    } else {
      console.log('[Manova Labs] HTTP server closed successfully.');
    }

    try {
      await prisma.$disconnect();
      console.log('[Manova Labs] Database connection disconnected.');
      clearTimeout(forceExitTimeout);
      process.exit(0);
    } catch (dbErr) {
      console.error('[Manova Labs] Error during database disconnect:', dbErr);
      clearTimeout(forceExitTimeout);
      process.exit(1);
    }
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason: unknown) => {
  console.error('[Manova Labs] Unhandled Promise Rejection:', reason);
  process.exit(1);
});

process.on('uncaughtException', (err: Error) => {
  console.error('[Manova Labs] Uncaught Exception:', err);
  process.exit(1);
});
