BEGIN;

DELETE FROM app_user
WHERE username = 'admin@example.com';

COMMIT;