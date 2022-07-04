ALTER TABLE app_user
ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN modified_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TRIGGER on_app_user_update
    AFTER UPDATE ON app_user
BEGIN
    UPDATE app_user SET modified_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
