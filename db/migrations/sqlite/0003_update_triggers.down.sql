BEGIN;

DROP TRIGGER on_recipe_update;
DROP TRIGGER on_recipe_tag_insert;
DROP TRIGGER on_recipe_tag_delete;
DROP TRIGGER on_recipe_note_update;
DROP TRIGGER on_recipe_image_update;

COMMIT;
