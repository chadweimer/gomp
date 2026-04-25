BEGIN;

ALTER TABLE recipe
DROP COLUMN main_image_name;

CREATE TABLE recipe_image (
    id SERIAL NOT NULL PRIMARY KEY,
    recipe_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    thumbnail_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(recipe_id) REFERENCES recipe(id) ON DELETE CASCADE
);
CREATE INDEX recipe_image_recipe_id_idx ON recipe_image(recipe_id);

ALTER TABLE recipe
ADD COLUMN image_id INTEGER REFERENCES recipe_image(id) ON DELETE SET NULL;

COMMIT;
