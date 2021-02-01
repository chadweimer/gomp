package db

import (
	"github.com/chadweimer/gomp/models"
	"github.com/jmoiron/sqlx"
)

type postgresUserDriver struct {
	*sqlUserDriver
}

func (d *postgresUserDriver) Create(user *models.User) error {
	return d.tx(func(tx *sqlx.Tx) error {
		return d.createtx(user, tx)
	})
}

func (d *postgresUserDriver) createtx(user *models.User, tx *sqlx.Tx) error {
	stmt := "INSERT INTO app_user (username, password_hash, access_level) " +
		"VALUES ($1, $2, $3) RETURNING id"

	return tx.Get(user, stmt, user.Username, user.PasswordHash, user.AccessLevel)
}

func (d *postgresUserDriver) CreateSearchFilter(filter *models.SavedSearchFilter) error {
	return d.tx(func(tx *sqlx.Tx) error {
		return d.createSearchFilterTx(filter, tx)
	})
}

func (d *postgresUserDriver) createSearchFilterTx(filter *models.SavedSearchFilter, tx *sqlx.Tx) error {
	stmt := "INSERT INTO search_filter (user_id, name, query, with_pictures, sort_by, sort_dir) " +
		"VALUES ($1, $2, $3, $4, $5, $6) RETURNING id"

	err := tx.Get(filter,
		stmt, filter.UserID, filter.Name, filter.Query, filter.WithPictures, filter.SortBy, filter.SortDir)
	if err != nil {
		return err
	}

	d.SetSearchFilterFieldsTx(filter.ID, filter.Fields, tx)
	if err != nil {
		return err
	}

	d.SetSearchFilterStatesTx(filter.ID, filter.Fields, tx)
	if err != nil {
		return err
	}

	d.SetSearchFilterTagsTx(filter.ID, filter.Fields, tx)
	if err != nil {
		return err
	}

	return nil
}
