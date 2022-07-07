PRAGMA foreign_keys=off;

BEGIN;

CREATE TABLE app_user_new (
    id INTEGER NOT NULL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    access_level TEXT CHECK(access_level IN ('admin', 'editor', 'viewer')) DEFAULT 'editor',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO app_user_new (id, username, password_hash, access_level)
  SELECT id, username, password_hash, access_level
  FROM app_user;

DROP TABLE app_user;

ALTER TABLE app_user_new RENAME TO app_user;

CREATE INDEX user_username_idx ON app_user(username);

CREATE TRIGGER on_app_user_update
    AFTER UPDATE ON app_user
    -- Intentionally ignore password here
    WHEN OLD.username IS NOT NEW.username OR OLD.access_level IS NOT NEW.access_level
BEGIN
    UPDATE app_user SET modified_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER on_app_user_insert
    AFTER INSERT ON app_user
BEGIN
    INSERT INTO app_user_settings(user_id) VALUES(NEW.id);
END;

COMMIT;

PRAGMA foreign_keys=on;
