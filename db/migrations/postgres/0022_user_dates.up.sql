BEGIN;

ALTER TABLE app_user
ADD COLUMN created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN modified_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE FUNCTION on_app_user_update() RETURNS TRIGGER AS $$
    BEGIN
        UPDATE app_user SET modified_at = CURRENT_TIMESTAMP WHERE id = NEW.id;

        RETURN NEW;
    END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_app_user_update
    AFTER UPDATE ON app_user
    FOR EACH ROW
    WHEN (OLD.* IS DISTINCT FROM NEW.*)
    EXECUTE FUNCTION on_app_user_update();

CREATE FUNCTION on_app_user_insert() RETURNS TRIGGER AS $$
    BEGIN
        INSERT INTO app_user_settings(user_id) VALUES(NEW.id);

        RETURN NEW;
    END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_app_user_insert
    AFTER INSERT ON app_user
    FOR EACH ROW
    EXECUTE FUNCTION on_app_user_insert();

COMMIT;
