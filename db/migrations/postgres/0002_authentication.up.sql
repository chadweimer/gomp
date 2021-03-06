BEGIN;

CREATE TABLE app_user (
    id SERIAL NOT NULL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL
);
CREATE INDEX user_username_idx ON app_user(username);

COMMIT;