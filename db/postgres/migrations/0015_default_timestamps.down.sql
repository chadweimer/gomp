BEGIN;

ALTER TABLE recipe_note
ALTER COLUMN created_at DROP DEFAULT,
ALTER COLUMN modified_at DROP DEFAULT;

ALTER TABLE recipe_image
ALTER COLUMN created_at DROP DEFAULT,
ALTER COLUMN modified_at DROP DEFAULT;

COMMIT;
