BEGIN;

ALTER TYPE recipe_field_name RENAME VALUE 'directions' TO 'description';

COMMIT;
