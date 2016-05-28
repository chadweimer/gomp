CREATE TABLE recipe (
    id INTEGER NOT NULL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    ingredients TEXT NOT NULL,
    directions TEXT NOT NULL
);
CREATE INDEX recipe_name_idx ON recipe(name);
CREATE INDEX recipe_description_idx ON recipe(description);
CREATE INDEX recipe_ingredients_idx ON recipe(ingredients);
CREATE INDEX recipe_directions_idx ON recipe(description);

CREATE TABLE recipe_tag (
    recipe_id INTEGER NOT NULL,
    tag TEXT NOT NULL,
    FOREIGN KEY(recipe_id) REFERENCES recipe(id)
);
CREATE INDEX recipe_tag_idx ON recipe_tag(tag);

CREATE TABLE recipe_note (
    id INTEGER NOT NULL PRIMARY KEY,
    recipe_id INTEGER NOT NULL,
    note TEXT NOT NULL,
    created_at DATETIME NOT NULL,
    modified_at DATETIME NOT NULL,
    FOREIGN KEY(recipe_id) REFERENCES recipe(id)
);
