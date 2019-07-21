BEGIN;

CREATE TABLE recipe_link (
    recipe_id INTEGER NOT NULL,
    dest_recipe_id INTEGER NOT NULL,
    UNIQUE(recipe_id, dest_recipe_id),
    CHECK (recipe_id != dest_recipe_id),
    FOREIGN KEY(recipe_id) REFERENCES recipe(id) ON DELETE CASCADE,
    FOREIGN KEY(dest_recipe_id) REFERENCES recipe(id) ON DELETE CASCADE
);
CREATE INDEX recipe_link_recipe_id_idx ON recipe_link(recipe_id);
CREATE INDEX recipe_link_dest_recipe_id_idx ON recipe_link(dest_recipe_id);

COMMIT;