CREATE TRIGGER on_recipe_update
    AFTER UPDATE ON recipe
BEGIN
    UPDATE recipe SET modified_at = CURRENT_TIMESTAMP WHERE id = new.id;
END;

CREATE TRIGGER on_recipe_note_update
    AFTER UPDATE ON recipe_note
BEGIN
    UPDATE recipe_note SET modified_at = CURRENT_TIMESTAMP WHERE id = new.id;
END;

CREATE TRIGGER on_recipe_image_update
    AFTER UPDATE ON recipe_image
BEGIN
    UPDATE recipe_image SET modified_at = CURRENT_TIMESTAMP WHERE id = new.id;
END;
