BEGIN;

CREATE TYPE recipe_sort_by AS ENUM ('id', 'name', 'created', 'modified', 'rating', 'random');
CREATE TYPE recipe_sort_dir AS ENUM ('asc', 'desc');
CREATE TYPE recipe_field_name AS ENUM ('name', 'ingredients', 'description');

CREATE TABLE search_filter (
    id SERIAL NOT NULL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    query TEXT,
    with_pictures BOOLEAN,
    sort_by recipe_sort_by NOT NULL,
    sort_dir recipe_sort_dir NOT NULL,
    FOREIGN KEY(user_id) REFERENCES app_user(id) ON DELETE CASCADE
);
CREATE INDEX search_filter_name_idx ON search_filter(name);
CREATE INDEX search_filter_user_id_idx ON search_filter(user_id);

CREATE TABLE search_filter_field (
    search_filter_id INTEGER NOT NULL,
    field_name recipe_field_name NOT NULL,
    UNIQUE(search_filter_id, field_name),
    FOREIGN KEY(search_filter_id) REFERENCES search_filter(id) ON DELETE CASCADE
);
CREATE INDEX search_filter_field_search_filter_id_idx ON search_filter_field(search_filter_id);

CREATE TABLE search_filter_state (
    search_filter_id INTEGER NOT NULL,
    state recipe_state NOT NULL,
    UNIQUE(search_filter_id, state),
    FOREIGN KEY(search_filter_id) REFERENCES search_filter(id) ON DELETE CASCADE
);
CREATE INDEX search_filter_state_search_filter_id_idx ON search_filter_state(search_filter_id);

CREATE TABLE search_filter_tag (
    search_filter_id INTEGER NOT NULL,
    tag TEXT NOT NULL,
    UNIQUE(search_filter_id, tag),
    FOREIGN KEY(search_filter_id) REFERENCES search_filter(id) ON DELETE CASCADE
);
CREATE INDEX search_filter_tag_search_filter_id_idx ON search_filter_tag(search_filter_id);

COMMIT;
