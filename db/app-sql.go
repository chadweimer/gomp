package db

import (
	"context"

	"github.com/chadweimer/gomp/models"
	"github.com/jmoiron/sqlx"
)

type sqlAppConfigurationDriver struct {
	Db *sqlx.DB
}

func (d *sqlAppConfigurationDriver) Read(ctx context.Context) (*models.AppConfiguration, error) {
	return get(d.Db, func(db sqlx.QueryerContext) (*models.AppConfiguration, error) {
		cfg := new(models.AppConfiguration)

		if err := sqlx.GetContext(ctx, db, cfg, "SELECT * FROM app_configuration"); err != nil {
			return nil, err
		}

		return cfg, nil
	})
}

func (d *sqlAppConfigurationDriver) Update(ctx context.Context, cfg *models.AppConfiguration) error {
	return tx(ctx, d.Db, func(db sqlx.ExtContext) error {
		return d.updateImpl(ctx, cfg, db)
	})
}

func (*sqlAppConfigurationDriver) updateImpl(ctx context.Context, cfg *models.AppConfiguration, db sqlx.ExecerContext) error {
	_, err := db.ExecContext(ctx, "UPDATE app_configuration SET title = $1", cfg.Title)
	return err
}
