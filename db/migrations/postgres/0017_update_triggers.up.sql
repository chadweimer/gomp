BEGIN;

-- recipe
CREATE FUNCTION on_recipe_update()
    RETURNS TRIGGER
    LANGUAGE PLPGSQL
    AS
$$
BEGIN
    UPDATE recipe SET modified_at = CURRENT_TIMESTAMP WHERE id = NEW.id;

    RETURN NEW;
END;
$$

CREATE TRIGGER on_recipe_update
    AFTER UPDATE ON recipe
    FOR EACH ROW
    WHEN (OLD.* IS DISTINCT FROM NEW.*)
    EXECUTE FUNCTION on_recipe_update();

-- recipe_note
CREATE FUNCTION on_recipe_note_update()
    RETURNS TRIGGER
    LANGUAGE PLPGSQL
    AS
$$
BEGIN
    UPDATE recipe_note SET modified_at = CURRENT_TIMESTAMP WHERE id = NEW.id;

    RETURN NEW;
END;
$$

CREATE TRIGGER on_recipe_note_update
    AFTER UPDATE ON recipe_note
    FOR EACH ROW
    WHEN (OLD.* IS DISTINCT FROM NEW.*)
    EXECUTE FUNCTION on_recipe_note_update();

-- recipe_image
CREATE FUNCTION on_recipe_image_update()
    RETURNS TRIGGER
    LANGUAGE PLPGSQL
    AS
$$
BEGIN
    UPDATE recipe_image SET modified_at = CURRENT_TIMESTAMP WHERE id = NEW.id;

    RETURN NEW;
END;
$$

CREATE TRIGGER on_recipe_image_update
    AFTER UPDATE ON recipe_image
    FOR EACH ROW
    WHEN (OLD.* IS DISTINCT FROM NEW.*)
    EXECUTE FUNCTION on_recipe_image_update();

COMMIT;
