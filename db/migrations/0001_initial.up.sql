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

CREATE TABLE ingredient (
    id INTEGER NOT NULL PRIMARY KEY,
    name TEXT NOT NULL
);
CREATE INDEX ingredient_name_idx ON ingredient(name);

CREATE TABLE unit (
    id INTEGER NOT NULL PRIMARY KEY,
    name TEXT NOT NULL,
    short_name TEXT,
    scale_factor FLOAT NOT NULL,
    category TEXT NOT NULL
);
CREATE INDEX unit_name_idx ON unit(name);
CREATE INDEX unit_short_name_idx ON unit(short_name);

CREATE TABLE recipe_ingedients (
    recipe_id INTEGER NOT NULL,
    unit_id INTEGER NOT NULL,
    ingredient_id INTEGER NOT NULL,
    amount FLOAT NOT NULL,
    amount_display TEXT,
    FOREIGN KEY(recipe_id) REFERENCES recipe(id),
    FOREIGN KEY(unit_id) REFERENCES unit(id),
    FOREIGN KEY(ingredient_id) REFERENCES ingredient(id)
);
