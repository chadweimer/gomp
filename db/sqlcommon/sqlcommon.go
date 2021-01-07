package sqlcommon

import (
	"fmt"
	"log"

	"github.com/jmoiron/sqlx"
)

type Driver struct {
	Db *sqlx.DB
}

func New(db *sqlx.DB) *Driver {
	return &Driver{Db: db}
}

func (d *Driver) Close() error {
	log.Print("Closing database connection...")
	if err := d.Db.Close(); err != nil {
		return fmt.Errorf("failed to close the connection to the database: '%+v'", err)
	}

	return nil
}

func (d *Driver) Tx(op func(*sqlx.Tx) error) error {
	tx, err := d.Db.Beginx()
	if err != nil {
		return err
	}
	defer func() {
		if recv := recover(); recv != nil {
			// Make sure to rollback after a panic...
			tx.Rollback()

			// ... but let the panicing continue
			panic(recv)
		}
	}()

	if err = op(tx); err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit()
}
