BEGIN;

ALTER TABLE recipe
DROP COLUMN source_url;

COMMIT;