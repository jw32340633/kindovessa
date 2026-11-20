ALTER TABLE admin_users ADD COLUMN username text;
UPDATE admin_users SET username = CASE WHEN email='admin@kindovessa.com' THEN 'admin' ELSE 'admin_' || replace(id::text, '-', '') END;
ALTER TABLE admin_users ALTER COLUMN username SET NOT NULL;
ALTER TABLE admin_users ADD CONSTRAINT admin_users_username_format CHECK (username ~ '^[a-z0-9_]{3,40}$');
ALTER TABLE admin_users ADD CONSTRAINT admin_users_username_unique UNIQUE (username);
