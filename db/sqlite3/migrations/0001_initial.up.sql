-- Schema

CREATE TABLE app_user (
    id INTEGER NOT NULL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    access_level TEXT CHECK(access_level IN ('admin', 'editor', 'viewer')) DEFAULT 'editor'
);
CREATE INDEX user_username_idx ON app_user(username);

CREATE TABLE app_user_settings (
    user_id INTEGER UNIQUE NOT NULL,
    home_title TEXT,
    home_image_url TEXT NOT NULL DEFAULT '/static/default-home-image.png',
    FOREIGN KEY(user_id) REFERENCES app_user(id) ON DELETE CASCADE
);

CREATE TABLE recipe (
    id INTEGER NOT NULL PRIMARY KEY,
    name TEXT NOT NULL,
    ingredients TEXT NOT NULL,
    directions TEXT NOT NULL,
    serving_size TEXT NOT NULL DEFAULT '',
    nutrition_info TEXT NOT NULL DEFAULT '',
    source_url TEXT NOT NULL DEFAULT '',
    image_id INTEGER REFERENCES recipe_image(id) ON DELETE SET NULL,
    current_state TEXT CHECK(current_state IN ('active', 'archived', 'deleted')) DEFAULT 'active',
    created_at DATETIME NOT NULL DEFAULT (datetime('now')),
    modified_at DATETIME NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX recipe_name_idx ON recipe(name);
CREATE INDEX recipe_ingredients_idx ON recipe(ingredients);
CREATE INDEX recipe_directions_idx ON recipe(directions);

CREATE TABLE recipe_tag (
    recipe_id INTEGER NOT NULL,
    tag TEXT NOT NULL,
    FOREIGN KEY(recipe_id) REFERENCES recipe(id) ON DELETE CASCADE
);
CREATE INDEX recipe_tag_idx ON recipe_tag(tag);
CREATE INDEX recipe_tag_recipe_id_idx ON recipe_tag(recipe_id);

CREATE TABLE recipe_note (
    id INTEGER NOT NULL PRIMARY KEY,
    recipe_id INTEGER NOT NULL,
    note TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT (datetime('now')),
    modified_at DATETIME NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(recipe_id) REFERENCES recipe(id) ON DELETE CASCADE
);
CREATE INDEX recipe_note_recipe_id_idx ON recipe_note(recipe_id);

CREATE TABLE recipe_rating (
    recipe_id INTEGER NOT NULL,
    rating REAL NOT NULL,
    FOREIGN KEY(recipe_id) REFERENCES recipe(id) ON DELETE CASCADE
);
CREATE INDEX recipe_rating_recipe_id_idx ON recipe_rating(recipe_id);

CREATE TABLE recipe_image (
    id INTEGER NOT NULL PRIMARY KEY,
    recipe_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    thumbnail_url TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT (datetime('now')),
    modified_at DATETIME NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(recipe_id) REFERENCES recipe(id) ON DELETE CASCADE
);
CREATE INDEX recipe_image_recipe_id_idx ON recipe_image(recipe_id);

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

-- Seed data

INSERT INTO app_user (username, password_hash, access_level)
SELECT 'admin@example.com', '$2a$08$1C0IMQAwkxLQcYvL/03jpuwOZjyF/6BCXgxHhkoarRoVp1wmiGwAS', 'admin';

INSERT INTO app_user_settings(user_id) SELECT id FROM app_user;
