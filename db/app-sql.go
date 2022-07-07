package db

import (
	"github.com/chadweimer/gomp/models"
	"github.com/jmoiron/sqlx"
)

type sqlAppConfigurationDriver struct {
	Db *sqlx.DB
}

func (d *sqlAppConfigurationDriver) Read() (*models.AppConfiguration, error) {
	return get(d.Db, func(db sqlx.Queryer) (*models.AppConfiguration, error) {
		cfg := new(models.AppConfiguration)

		if err := sqlx.Get(db, cfg, "SELECT * FROM app_configuration"); err != nil {
			return nil, err
		}

		return cfg, nil
	})
}

func (d *sqlAppConfigurationDriver) Update(cfg *models.AppConfiguration) error {
	return tx(d.Db, func(db sqlx.Ext) error {
		return d.updateImpl(cfg, db)
	})
}

func (*sqlAppConfigurationDriver) updateImpl(cfg *models.AppConfiguration, db sqlx.Execer) error {
	_, err := db.Exec("UPDATE app_configuration SET title = $1", cfg.Title)
	return err
}
