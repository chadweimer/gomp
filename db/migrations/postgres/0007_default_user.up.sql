BEGIN;

INSERT INTO app_user (username, password_hash)
SELECT 'admin@example.com', '$2a$08$1C0IMQAwkxLQcYvL/03jpuwOZjyF/6BCXgxHhkoarRoVp1wmiGwAS'
WHERE NOT EXISTS (SELECT id FROM app_user LIMIT 1);

COMMIT;