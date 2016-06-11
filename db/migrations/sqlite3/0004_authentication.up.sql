CREATE TABLE user (
    id INTEGER NOT NULL PRIMARY KEY,
    username TEXT NOT NULL,
    password_hash TEXT NOT NULL
);
CREATE INDEX user_username_idx ON user(username);