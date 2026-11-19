import { randomUUID } from 'node:crypto';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { errorHandler } from './middleware/error-handler.js';
import { healthRouter } from './routes/health.js';

export function createApp(options: { databaseCheck?: () => Promise<boolean>; rateLimitMax?: number } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', env.TRUST_PROXY ? env.TRUST_PROXY.split(',').map((value) => value.trim()) : false);
  app.use(helmet());
  app.use((_request, response, next) => {
    const requestId = randomUUID();
    const started = performance.now();
    response.locals.requestId = requestId;
    response.setHeader('X-Request-Id', requestId);
    response.setHeader('Cache-Control', 'no-store');
    response.on('finish', () => logger.info({ requestId, method: _request.method, status: response.statusCode, durationMs: Math.round(performance.now() - started) }, 'Request completed'));
    next();
  });
  app.use((request, response, next) => {
    const origin = request.get('origin');
    if (origin && !env.CORS_ORIGINS.includes(origin)) {
      response.status(403).json({ error: { code: 'ORIGIN_NOT_ALLOWED', message: 'Origin is not allowed.', requestId: response.locals.requestId } });
      return;
    }
    next();
  });
  app.use(cors({ origin: env.CORS_ORIGINS, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }));
  app.use('/health', healthRouter(options.databaseCheck));
  app.use('/api', rateLimit({ windowMs: env.RATE_LIMIT_WINDOW_MS, limit: options.rateLimitMax ?? env.RATE_LIMIT_MAX, standardHeaders: 'draft-8', legacyHeaders: false, handler: (_request, response) => { response.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.', requestId: response.locals.requestId } }); } }));
  app.use(express.json({ limit: '32kb', strict: true }));
  app.use((_request, response) => { response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found.', requestId: response.locals.requestId } }); });
  app.use(errorHandler);
  return app;
}
