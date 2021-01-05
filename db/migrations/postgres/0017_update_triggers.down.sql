BEGIN;

DROP TRIGGER on_recipe_update ON recipe;
DROP FUNCTION on_recipe_update();

DROP TRIGGER on_recipe_tag_insert ON recipe_tag;
DROP FUNCTION on_recipe_tag_insert();

DROP TRIGGER on_recipe_tag_delete ON recipe_tag;
DROP FUNCTION on_recipe_tag_delete();

DROP TRIGGER on_recipe_note_update ON recipe_note;
DROP FUNCTION on_recipe_note_update();

DROP TRIGGER on_recipe_image_update ON recipe_image;
DROP FUNCTION on_recipe_image_update();

COMMIT;
