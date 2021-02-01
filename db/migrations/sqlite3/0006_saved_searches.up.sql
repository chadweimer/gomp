CREATE TABLE search_filter (
    id INTEGER NOT NULL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    query TEXT,
    with_pictures BOOLEAN,
    sort_by TEXT CHECK(sort_by IN ('id', 'name', 'created', 'modified', 'rating', 'random')),
    sort_dir TEXT CHECK(sort_dir IN ('asc', 'desc')),
    FOREIGN KEY(user_id) REFERENCES app_user(id) ON DELETE CASCADE
);

CREATE TABLE search_filter_field (
    search_filter_id INTEGER NOT NULL,
    field_name TEXT CHECK(field_name IN ('name', 'ingredients', 'description')),
    UNIQUE(search_filter_id, field_name),
    FOREIGN KEY(search_filter_id) REFERENCES search_filter(id) ON DELETE CASCADE
);

CREATE TABLE search_filter_state (
    search_filter_id INTEGER NOT NULL,
    state TEXT CHECK(state IN ('active', 'archived', 'deleted')),
    UNIQUE(search_filter_id, state),
    FOREIGN KEY(search_filter_id) REFERENCES search_filter(id) ON DELETE CASCADE
);

CREATE TABLE search_filter_tag (
    search_filter_id INTEGER NOT NULL,
    tag TEXT NOT NULL,
    UNIQUE(search_filter_id, tag),
    FOREIGN KEY(search_filter_id) REFERENCES search_filter(id) ON DELETE CASCADE
);
