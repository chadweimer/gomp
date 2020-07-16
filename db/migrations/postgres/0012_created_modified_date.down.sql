BEGIN;

ALTER TABLE recipe
DROP COLUMN created_at,
DROP COLUMN modified_at;

COMMIT;