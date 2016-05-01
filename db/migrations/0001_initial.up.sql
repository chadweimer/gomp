CREATE TABLE recipe (
    id INTEGER NOT NULL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    directions TEXT
);
CREATE INDEX recipe_name_idx ON recipe(name);

CREATE TABLE recipe_tags (
    recipe_id INTEGER NOT NULL,
    tag TEXT NOT NULL,
    FOREIGN KEY(recipe_id) REFERENCES recipe(id)
);
CREATE INDEX recipe_tag_idx ON recipe_tags(tag);

CREATE TABLE unit (
    id INTEGER NOT NULL PRIMARY KEY,
    name TEXT NOT NULL,
    short_name TEXT,
    scale_factor REAL NOT NULL,
    category TEXT NOT NULL
);
CREATE INDEX unit_name_idx ON unit(name);
CREATE INDEX unit_short_name_idx ON unit(short_name);

CREATE TABLE recipe_ingredient (
    name INTEGER NOT NULL,
    amount REAL NOT NULL,
    amount_display TEXT,
    recipe_id INTEGER NOT NULL,
    unit_id INTEGER NOT NULL,
    FOREIGN KEY(recipe_id) REFERENCES recipe(id),
    FOREIGN KEY(unit_id) REFERENCES unit(id)
);
CREATE INDEX recipe_ingredient_name_idx ON recipe_ingredient(name);
