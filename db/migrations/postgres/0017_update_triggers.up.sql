BEGIN;

-- recipe
CREATE FUNCTION on_recipe_update() RETURNS TRIGGER AS $$
    BEGIN
        UPDATE recipe SET modified_at = CURRENT_TIMESTAMP WHERE id = NEW.id;

        RETURN NEW;
    END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_recipe_update
    AFTER UPDATE ON recipe
    FOR EACH ROW
    WHEN (OLD.* IS DISTINCT FROM NEW.*)
    EXECUTE FUNCTION on_recipe_update();

CREATE FUNCTION on_recipe_tag_insert() RETURNS TRIGGER AS $$
    BEGIN
        UPDATE recipe SET modified_at = CURRENT_TIMESTAMP WHERE id = NEW.recipe_id;

        RETURN NEW;
    END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_recipe_tag_insert
    AFTER INSERT ON recipe_tag
    FOR EACH ROW
    EXECUTE FUNCTION on_recipe_tag_insert();

CREATE FUNCTION on_recipe_tag_delete() RETURNS TRIGGER AS $$
    BEGIN
        UPDATE recipe SET modified_at = CURRENT_TIMESTAMP WHERE id = OLD.recipe_id;

        RETURN OLD;
    END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_recipe_tag_delete
    AFTER DELETE ON recipe_tag
    FOR EACH ROW
    EXECUTE FUNCTION on_recipe_tag_delete();

-- recipe_note
CREATE FUNCTION on_recipe_note_update() RETURNS TRIGGER AS $$
    BEGIN
        UPDATE recipe_note SET modified_at = CURRENT_TIMESTAMP WHERE id = NEW.id;

        RETURN NEW;
    END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_recipe_note_update
    AFTER UPDATE ON recipe_note
    FOR EACH ROW
    WHEN (OLD.* IS DISTINCT FROM NEW.*)
    EXECUTE FUNCTION on_recipe_note_update();

-- recipe_image
CREATE FUNCTION on_recipe_image_update() RETURNS TRIGGER AS $$
    BEGIN
        UPDATE recipe_image SET modified_at = CURRENT_TIMESTAMP WHERE id = NEW.id;

        RETURN NEW;
    END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_recipe_image_update
    AFTER UPDATE ON recipe_image
    FOR EACH ROW
    WHEN (OLD.* IS DISTINCT FROM NEW.*)
    EXECUTE FUNCTION on_recipe_image_update();

COMMIT;
