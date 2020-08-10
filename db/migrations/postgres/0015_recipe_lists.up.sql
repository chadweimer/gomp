BEGIN;

CREATE TABLE menu (
    id SERIAL NOT NULL PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE TABLE menu_recipe (
    menu_id INTEGER NOT NULL,
    recipe_id INTEGER NOT NULL,
    FOREIGN KEY(menu_id) REFERENCES menu(id) ON DELETE CASCADE,
    FOREIGN KEY(recipe_id) REFERENCES recipe(id) ON DELETE CASCADE
);
CREATE INDEX menu_recipe_menu_id_idx ON menu(id);
CREATE INDEX menu_recipe_recipe_id_idx ON recipe(id);

CREATE TABLE recipe_list (
    id SERIAL NOT NULL PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    modified_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE recipe_list_menu (
    recipe_list_id INTEGER NOT NULL,
    menu_id INTEGER NOT NULL,
    FOREIGN KEY(recipe_list_id) REFERENCES recipe_list(id) ON DELETE CASCADE,
    FOREIGN KEY(menu_id) REFERENCES menu(id) ON DELETE CASCADE
);
CREATE INDEX recipe_list_menu_recipe_list_id_idx ON recipe_list(id);
CREATE INDEX recipe_list_menu_menu_id_idx ON menu(id);

COMMIT;
