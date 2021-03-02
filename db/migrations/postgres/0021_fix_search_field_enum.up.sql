BEGIN;

ALTER TYPE recipe_field_name RENAME VALUE 'description' TO 'directions';

COMMIT;
