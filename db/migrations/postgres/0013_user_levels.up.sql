BEGIN;

CREATE TYPE user_level AS ENUM ('admin', 'editor', 'viewer');

ALTER TABLE app_user
ADD COLUMN access_level user_level DEFAULT 'editor';

-- Create a new admin user with password 'password', if necessary.
-- This can be deleted after creating/assigning a real admin.
INSERT INTO app_user (username, password_hash)
VALUES('admin@example.com', '$2a$08$1C0IMQAwkxLQcYvL/03jpuwOZjyF/6BCXgxHhkoarRoVp1wmiGwAS')
ON CONFLICT(username) DO NOTHING;

UPDATE app_user SET access_level = 'admin' WHERE username = 'admin@example.com';

COMMIT;
