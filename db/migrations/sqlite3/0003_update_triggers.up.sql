-- recipe
CREATE TRIGGER on_recipe_update
    AFTER UPDATE ON recipe
BEGIN
    UPDATE recipe SET modified_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER on_recipe_tag_insert
    AFTER INSERT ON recipe_tag
BEGIN
    UPDATE recipe SET modified_at = CURRENT_TIMESTAMP WHERE id = NEW.recipe_id;
END;

CREATE TRIGGER on_recipe_tag_delete
    AFTER DELETE ON recipe_tag
BEGIN
    UPDATE recipe SET modified_at = CURRENT_TIMESTAMP WHERE id = OLD.recipe_id;
END;

-- recipe_note
CREATE TRIGGER on_recipe_note_update
    AFTER UPDATE ON recipe_note
BEGIN
    UPDATE recipe_note SET modified_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- recipe_image
CREATE TRIGGER on_recipe_image_update
    AFTER UPDATE ON recipe_image
BEGIN
    UPDATE recipe_image SET modified_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
