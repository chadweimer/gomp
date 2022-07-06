BEGIN;

ALTER TABLE app_user DROP COLUMN created_at;
ALTER TABLE app_user DROP COLUMN modified_at;

DROP TRIGGER on_app_user_update;
DROP TRIGGER on_app_user_insert;

COMMIT;
