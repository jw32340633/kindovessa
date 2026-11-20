# Admin authentication

Run `npm run db:migrate` to apply the tracked auth schema migration. Set `ADMIN_PASSWORD` in your shell or ignored local `.env`, then run `npm run admin:create`. Provisioning creates Admin Adminstration with username `admin` and email admin@kindovessa.com and never overwrites an existing account. There is no public signup endpoint. Do not commit passwords. Change the initial password before a public launch.

PowerShell provisioning (enter the initial password when prompted):

```powershell
npm run db:migrate
$initialPassword = Read-Host 'Initial admin password' -AsSecureString
$env:ADMIN_PASSWORD = [System.Net.NetworkCredential]::new('', $initialPassword).Password
try {
  npm run admin:create
  npm run auth:verify
} finally { Remove-Item Env:ADMIN_PASSWORD }
```

Sessions use random 256-bit bearer tokens; only SHA-256 hashes are persisted. Passwords use salted scrypt (N=32768,r=8,p=1). Sessions expire eight hours after login. Refresh rotates the token every 15 minutes from the admin app without extending the original expiry; logout revokes the session. Five failed attempts temporarily lock the account for 15 minutes. IP rate limits remain process-local; use an edge/shared limiter before multiple replicas.

The admin uses a same-origin server route to hold tokens in Secure, HttpOnly, SameSite=Strict cookies in production. Set server-only `API_URL=https://kindovessa-backend.up.railway.app` in Vercel. No NEXT_PUBLIC token configuration is needed. All mutation routes validate Origin. Dashboard proxy checks cookie presence; server layouts/pages and the backend independently verify the database session. Every future private backend route must use `requireAdmin`; every private admin data action must recheck auth. Frontend/customer authentication is outside this feature.

Deploy backend migration and backend code before the admin integration. No existing business tables are modified. Do not log bearer tokens or passwords. Keep database credentials in deployment secrets. The public deployments are unchanged until these files are deployed.

Login uses `{ username, password }`. Usernames are case-insensitive, normalized to lowercase, and contain 3-40 letters, numbers, or underscores. Email remains profile data. Migration 002 backfills the existing primary admin username as `admin` without changing its password or sessions.

## Settings

`POST /api/v1/auth/settings` requires the authenticated admin session and current password. Accepted fields: `firstName`, `lastName`, `username`, `currentPassword`, `password`, `confirmPassword`. Leave both new-password fields empty for a profile-only update. New passwords require 12-128 characters and must differ from the current password. Credential changes revoke all sessions, including the current session; the admin proxy clears its cookie and returns to login. Profile-only changes preserve sessions. Email is read-only. Updates always target the authenticated identity; no user ID is accepted from the browser. All SQL changes occur in a transaction with the account locked and session rechecked.

There are no customer accounts, signup, roles UI, or user-management endpoints. The dashboard proxy validates every `/dashboard/*` URL against the backend; layouts recheck authorization, and current pages reuse `ProtectedPage` with a streaming loader. Future private backend endpoints must still apply `requireAdmin`; frontend route protection does not authorize API access.
