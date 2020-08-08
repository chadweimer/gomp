BEGIN;

CREATE TYPE recipe_state AS ENUM ('active', 'archived', 'deleted');

ALTER TABLE recipe
ADD COLUMN current_state recipe_state DEFAULT 'active';

COMMIT;
