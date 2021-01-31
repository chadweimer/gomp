CREATE TABLE app_user_favorite_tag (
    user_id INTEGER NOT NULL,
    tag TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES app_user(id) ON DELETE CASCADE
);
CREATE INDEX app_user_favorite_tag_idx ON app_user_favorite_tag(tag);
CREATE INDEX app_user_favorite_tag_user_id_idx ON app_user_favorite_tag(user_id);
