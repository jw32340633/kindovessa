import { createServer } from 'node:http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { pool } from './db/pool.js';
import { logger } from './lib/logger.js';

const server = createServer(createApp());
server.requestTimeout = 30000;
server.headersTimeout = 15000;
server.keepAliveTimeout = 5000;
server.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, 'API listening');
  if (!pool) logger.warn('DATABASE_URL is empty; database readiness will return 503');
});

let shuttingDown = false;
function shutdown(exitCode: number) {
  if (shuttingDown) return;
  shuttingDown = true;
  const deadline = setTimeout(() => process.exit(1), 10000);
  deadline.unref();
  server.close(() => {
    void (async () => {
      try { await pool?.end(); process.exitCode = exitCode; }
      catch { process.exitCode = 1; }
      finally { clearTimeout(deadline); }
    })();
  });
}
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
server.on('error', (error: NodeJS.ErrnoException) => {
  logger.fatal({ code: error.code, port: env.PORT },
    error.code === 'EADDRINUSE'
      ? 'Port is already in use. Stop the other API process before restarting.'
      : 'HTTP server failed to listen');
  shutdown(1);
});
process.on('uncaughtException', () => { logger.fatal('Uncaught exception; shutting down'); shutdown(1); });
process.on('unhandledRejection', () => { logger.fatal('Unhandled rejection; shutting down'); shutdown(1); });
