# Kindovessa API

Node 24 LTS, TypeScript, Express 5 REST API, and PostgreSQL through `pg`. Express keeps this initial service small; no ORM, schema, authentication, or business modules are added yet. Dependencies supply HTTP security headers, CORS, rate limiting, environment validation, PostgreSQL connections, and structured logs rather than custom infrastructure.

## Local development

1. Run `npm install` (or `npm ci` with the lockfile).
2. Copy `.env.example` to `.env` if needed. Never commit credentials.
3. Set `DATABASE_URL` to your Neon pooled URL and change its `sslmode` to `verify-full` to retain TLS certificate verification. Without a URL, development runs but readiness returns 503. Production requires the URL.
4. Run `npm run dev`. Default address: `http://127.0.0.1:4000`.

`GET /health/live` checks the HTTP process. `GET /health/ready` performs only `SELECT 1` and returns 503 if PostgreSQL is missing or unavailable. Neither endpoint creates tables or modifies data. Future business routes belong under `/api/v1`.

## Structure

- `src/config`: validated environment settings.
- `src/db`: shared, bounded database connection pool.
- `src/lib`: shared logger.
- `src/middleware`: centralized sanitized error responses.
- `src/routes`: HTTP route handlers; add feature folders when actual features arrive.
- `src/app.ts`: middleware and route composition, independently testable.
- `src/server.ts`: HTTP listener, timeouts, graceful shutdown.
- `test`: HTTP integration tests without a real database.

## Validation and deployment

Run `npm run typecheck`, `npm test`, and `npm run build`. Deploy with `npm ci`, `npm run build`, then `npm start`; supply `NODE_ENV=production`, `HOST=0.0.0.0`, real HTTPS `CORS_ORIGINS`, and the database URL through deployment secrets. Terminate HTTPS at the hosting platform and run the process under its supervisor.

Leave `TRUST_PROXY` empty unless a reverse proxy is deployed; configure only its trusted IP addresses/CIDRs. Do not blindly trust forwarded headers. Rate limiting uses an in-memory store for a single process and resets on restart. Before multiple replicas, use a shared limiter or platform edge limits. Health endpoints bypass this limiter for probes; restrict them at the hosting layer if needed.

CORS is an origin policy, not authentication. No protected business routes exist yet. Cookie authentication, CSRF controls, and tighter login-specific limits will be added with admin login. Logs intentionally omit bodies, headers, client IPs, URLs, database errors, and credentials. Error responses include a server-generated request ID without internal exception details. Request schemas will be validated at each future feature boundary.

No migrations run automatically. Provision the Neon project separately and use least-privilege database credentials. A successful build or mocked readiness test does not verify the real Neon connection; confirm `/health/ready` after configuring credentials.
