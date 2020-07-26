BEGIN;

ALTER TABLE recipe
DROP COLUMN current_state;

DROP TYPE recipe_state;

COMMIT;
