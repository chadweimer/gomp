package sqlcommon

import (
	"github.com/chadweimer/gomp/models"
	"github.com/jmoiron/sqlx"
)

type AppConfigurationDriver struct {
	*Driver
}

func (d *AppConfigurationDriver) Read() (*models.AppConfiguration, error) {
	cfg := new(models.AppConfiguration)

	if err := d.Db.Get(cfg, "SELECT * FROM app_configuration"); err != nil {
		return nil, err
	}

	return cfg, nil
}

func (d *AppConfigurationDriver) Update(cfg *models.AppConfiguration) error {
	return d.Tx(func(tx *sqlx.Tx) error {
		return d.updateTx(cfg, tx)
	})
}

func (d *AppConfigurationDriver) updateTx(cfg *models.AppConfiguration, tx *sqlx.Tx) error {
	_, err := tx.Exec("UPDATE app_configuration SET title = $1", cfg.Title)
	return err
}
