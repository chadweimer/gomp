BEGIN;

ALTER TABLE app_user
DROP COLUMN created_at,
DROP COLUMN modified_at;

DROP TRIGGER on_app_user_update ON app_user;
DROP FUNCTION on_app_user_update();

COMMIT;
