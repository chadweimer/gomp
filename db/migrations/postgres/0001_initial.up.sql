BEGIN;
CREATE TABLE recipe (
    id SERIAL NOT NULL PRIMARY KEY,
    name TEXT NOT NULL,
    ingredients TEXT NOT NULL,
    directions TEXT NOT NULL,
    serving_size TEXT NOT NULL DEFAULT '',
    nutrition_info TEXT NOT NULL DEFAULT ''
);
CREATE INDEX recipe_name_idx ON recipe(name);
CREATE INDEX recipe_ingredients_idx ON recipe(ingredients);
CREATE INDEX recipe_directions_idx ON recipe(directions);

CREATE TABLE recipe_tag (
    recipe_id INTEGER NOT NULL,
    tag TEXT NOT NULL,
    FOREIGN KEY(recipe_id) REFERENCES recipe(id)
);
CREATE INDEX recipe_tag_idx ON recipe_tag(tag);

CREATE TABLE recipe_note (
    id SERIAL NOT NULL PRIMARY KEY,
    recipe_id INTEGER NOT NULL,
    note TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    modified_at TIMESTAMP WITH TIME ZONE NOT NULL,
    FOREIGN KEY(recipe_id) REFERENCES recipe(id)
);

CREATE TABLE recipe_rating (
    recipe_id INTEGER NOT NULL,
    rating REAL NOT NULL,
    FOREIGN KEY(recipe_id) REFERENCES recipe(id)
);
COMMIT;
