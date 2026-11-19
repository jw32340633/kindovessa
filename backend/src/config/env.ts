import 'dotenv/config';
import { z } from 'zod';

const integer = (fallback: number, max: number) => z.coerce.number().int().positive().max(max).default(fallback);
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().min(1).default('127.0.0.1'),
  PORT: integer(4000, 65535),
  DATABASE_URL: z.string().default('').refine((value) => {
    if (!value) return true;
    try {
      const url = new URL(value);
      return ['postgres:', 'postgresql:'].includes(url.protocol) && !!url.hostname && url.searchParams.get('sslmode') === 'verify-full';
    } catch { return false; }
  }, 'Use a PostgreSQL URL with sslmode=verify-full.'),
  DB_POOL_MAX: integer(5, 50),
  DB_CONNECTION_TIMEOUT_MS: integer(10000, 60000),
  CORS_ORIGINS: z.string().default('http://localhost:3000,http://localhost:3001').transform((value) => value.split(',').map((origin) => origin.trim()).filter(Boolean)).pipe(z.array(z.url().refine((value) => { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && url.origin === value; })).min(1)),
  TRUST_PROXY: z.string().default(''),
  RATE_LIMIT_WINDOW_MS: integer(60000, 3600000),
  RATE_LIMIT_MAX: integer(120, 100000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'silent']).default('info'),
}).superRefine((env, context) => {
  if (env.NODE_ENV === 'production' && !env.DATABASE_URL) context.addIssue({ code: 'custom', path: ['DATABASE_URL'], message: 'Required in production.' });
  if (env.NODE_ENV === 'production' && env.CORS_ORIGINS.some((origin) => !origin.startsWith('https://'))) context.addIssue({ code: 'custom', path: ['CORS_ORIGINS'], message: 'Production origins must use HTTPS.' });
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  // Report field names only: validation errors must never print credentials.
  console.error('Invalid environment variables:', [...new Set(parsed.error.issues.map((issue) => issue.path.join('.')))].join(', '));
  process.exit(1);
}
export const env = parsed.data;
