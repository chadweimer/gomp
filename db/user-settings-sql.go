package db

import (
	"context"
	"fmt"

	"github.com/chadweimer/gomp/models"
	"github.com/jmoiron/sqlx"
)

type sqlUserSettingsDriver struct {
	Db *sqlx.DB
}

func (d *sqlUserSettingsDriver) Read(ctx context.Context, id int64) (*models.UserSettings, error) {
	return get(d.Db, func(db sqlx.QueryerContext) (*models.UserSettings, error) {
		return d.readImpl(ctx, id, db)
	})
}

func (*sqlUserSettingsDriver) readImpl(ctx context.Context, id int64, db sqlx.QueryerContext) (*models.UserSettings, error) {
	userSettings := new(models.UserSettings)

	if err := sqlx.GetContext(ctx, db, userSettings, "SELECT * FROM app_user_settings WHERE user_id = $1", id); err != nil {
		return nil, err
	}

	tags := make([]string, 0)
	if err := sqlx.SelectContext(ctx, db, &tags, "SELECT tag FROM app_user_favorite_tag WHERE user_id = $1 ORDER BY tag ASC", id); err != nil {
		return nil, err
	}
	userSettings.FavoriteTags = tags

	return userSettings, nil
}

func (d *sqlUserSettingsDriver) Update(ctx context.Context, settings *models.UserSettings) error {
	return tx(ctx, d.Db, func(db *sqlx.Tx) error {
		return d.updateImpl(ctx, settings, db)
	})
}

func (*sqlUserSettingsDriver) updateImpl(ctx context.Context, settings *models.UserSettings, db sqlx.ExecerContext) error {
	_, err := db.ExecContext(ctx,
		"UPDATE app_user_settings "+
			"SET home_title = $1, home_image_url = $2 WHERE user_id = $3",
		settings.HomeTitle, settings.HomeImageURL, settings.UserID)
	if err != nil {
		return err
	}

	// Deleting and recreating seems inefficient. Maybe make this smarter.
	_, err = db.ExecContext(ctx,
		"DELETE FROM app_user_favorite_tag WHERE user_id = $1",
		settings.UserID)
	if err != nil {
		return fmt.Errorf("deleting favorite tags before updating on user: %w", err)
	}
	for _, tag := range settings.FavoriteTags {
		_, err = db.ExecContext(ctx,
			"INSERT INTO app_user_favorite_tag (user_id, tag) VALUES ($1, $2)",
			settings.UserID, tag)
		if err != nil {
			return fmt.Errorf("updating favorite tags on user: %w", err)
		}
	}

	return nil
}
