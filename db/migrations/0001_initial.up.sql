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

CREATE TABLE quantity (
    id INTEGER NOT NULL PRIMARY KEY,
    name TEXT NOT NULL,
    short_name TEXT
);
CREATE INDEX quantity_name_idx ON quantity(name);
CREATE INDEX quantity_short_name_idx ON quantity(short_name);

CREATE TABLE recipe_ingedients (
    recipe_id INTEGER NOT NULL,
    quantity_id INTEGER NOT NULL,
    ingredient_id INTEGER NOT NULL,
    amount INTEGER NOT NULL,
    FOREIGN KEY(recipe_id) REFERENCES recipe(id),
    FOREIGN KEY(quantity_id) REFERENCES quantity(id),
    FOREIGN KEY(ingredient_id) REFERENCES ingredient(id)
);
