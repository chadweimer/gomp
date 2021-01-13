package db

import (
	"github.com/chadweimer/gomp/models"
	"github.com/jmoiron/sqlx"
)

type sqlAppConfigurationDriver struct {
	*sqlDriver
}

func (d *sqlAppConfigurationDriver) Read() (*models.AppConfiguration, error) {
	cfg := new(models.AppConfiguration)

	if err := d.Db.Get(cfg, "SELECT * FROM app_configuration"); err != nil {
		return nil, err
	}

	return cfg, nil
}

func (d *sqlAppConfigurationDriver) Update(cfg *models.AppConfiguration) error {
	return d.tx(func(tx *sqlx.Tx) error {
		return d.updatetx(cfg, tx)
	})
}

func (d *sqlAppConfigurationDriver) updatetx(cfg *models.AppConfiguration, tx *sqlx.Tx) error {
	_, err := tx.Exec("UPDATE app_configuration SET title = $1", cfg.Title)
	return err
}
