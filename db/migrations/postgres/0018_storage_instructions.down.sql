BEGIN;

ALTER TABLE recipe
DROP COLUMN storage_instructions;

COMMIT;
