CREATE TABLE app_user_settings (
    user_id INTEGER UNIQUE NOT NULL,
    home_title TEXT NOT NULL DEFAULT 'Go Meal Planner',
    home_image_url TEXT NOT NULL DEFAULT '/static/default-home-image.png',
    FOREIGN KEY(user_id) REFERENCES app_user(id) ON DELETE CASCADE
);

INSERT INTO app_user_settings(user_id) SELECT id FROM app_user;