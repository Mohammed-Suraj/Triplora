import { createApp } from './app';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/db';
import { startEmailSchedulers } from './services/scheduler';

async function bootstrap(): Promise<void> {
  await connectDatabase();

  const app = createApp();

  const server = app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`[server] Triplora API running on port ${env.port} (${env.nodeEnv})`);
    // eslint-disable-next-line no-console
    console.log(`[server] Base URL: http://localhost:${env.port}${env.apiPrefix}`);
  });

  startEmailSchedulers();

  const shutdown = async (signal: string) => {
    // eslint-disable-next-line no-console
    console.log(`[server] Received ${signal}, shutting down gracefully...`);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  process.on('unhandledRejection', (reason) => {
    // eslint-disable-next-line no-console
    console.error('[unhandledRejection]', reason);
  });
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('[server] Failed to start:', error);
  process.exit(1);
});
