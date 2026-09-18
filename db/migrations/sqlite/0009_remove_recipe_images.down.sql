BEGIN;

ALTER TABLE recipe
DROP COLUMN main_image_name;

CREATE TABLE recipe_image (
    id INTEGER NOT NULL PRIMARY KEY,
    recipe_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    thumbnail_url TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(recipe_id) REFERENCES recipe(id) ON DELETE CASCADE
);
CREATE INDEX recipe_image_recipe_id_idx ON recipe_image(recipe_id);
CREATE TRIGGER on_recipe_image_update
    AFTER UPDATE ON recipe_image
BEGIN
    UPDATE recipe_image SET modified_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

ALTER TABLE recipe
ADD COLUMN image_id INTEGER REFERENCES recipe_image(id) ON DELETE SET NULL;

COMMIT;
