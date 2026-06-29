import 'dotenv/config';
import app from './app';
import { config } from './config';
import prisma from './db/prismaClient';

async function main() {
  // Verify database connection
  try {
    await prisma.$connect();
    console.log('[DB] Connected to PostgreSQL');
  } catch (err) {
    console.error('[DB] Failed to connect to PostgreSQL:', err);
    console.warn('[DB] Running without database – persistent features will be unavailable');
  }

  const server = app.listen(config.port, () => {
    console.log(`[${config.appName}] Server running on http://localhost:${config.port}`);
    console.log(`[${config.appName}] Environment: ${config.nodeEnv}`);
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\n[Server] Shutting down gracefully...');
    server.close(async () => {
      await prisma.$disconnect();
      console.log('[DB] Disconnected');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('[Fatal]', err);
  process.exit(1);
});
