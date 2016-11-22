CREATE TABLE app_role (
    id SERIAL NOT NULL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);
CREATE INDEX app_role_name_idx ON app_role(name);

CREATE TABLE user_roles (
    user_id INTEGER NOT NULL,
    role_id INTEGER NOT NULL,
    FOREIGN KEY(user_id) REFERENCES app_user(id) ON DELETE CASCADE,
    FOREIGN KEY(role_id) REFERENCES app_role(id)
);

INSERT INTO app_role (name) VALUES('Administrator');
INSERT INTO app_role (name) VALUES('Editor');
INSERT INTO app_role (name) VALUES('Viewer');

-- Default all existing users to Editor,
-- since that matches what they would have before roles.
INSERT INTO user_roles (user_id, role_id) (
    SELECT id, (SELECT id FROM app_role WHERE name = 'Editor') FROM app_user
);

-- Create a new admin user with password 'password'.
-- This can be deleted after creating/assigning a real admin.
INSERT INTO app_user (username, password_hash)
VALUES('admin@example.com', '$2a$06$CHCGJ/vKVC4/txqvCp/3IO1MdPJosLr3gV1phWI6VRedk.W29AH3e');
INSERT INTO user_roles (user_id, role_id) (
    SELECT id, (SELECT id FROM app_role WHERE name = 'Administrator') FROM app_user WHERE username = 'admin@example.com'
);