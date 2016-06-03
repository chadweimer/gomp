CREATE TABLE recipe_rating (
    recipe_id INTEGER NOT NULL,
    rating REAL NOT NULL,
    FOREIGN KEY(recipe_id) REFERENCES recipe(id)
);
