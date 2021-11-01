package db

import (
	"errors"

	"github.com/chadweimer/gomp/generated/models"
	"github.com/jmoiron/sqlx"
)

type postgresUserDriver struct {
	*sqlUserDriver
}

func (d *postgresUserDriver) Create(user *UserWithPasswordHash) error {
	return d.tx(func(tx *sqlx.Tx) error {
		return d.createtx(user, tx)
	})
}

func (d *postgresUserDriver) createtx(user *UserWithPasswordHash, tx *sqlx.Tx) error {
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
	if filter.UserId == nil {
		return errors.New("user id is required")
	}

	stmt := "INSERT INTO search_filter (user_id, name, query, with_pictures, sort_by, sort_dir) " +
		"VALUES ($1, $2, $3, $4, $5, $6) RETURNING id"

	err := tx.Get(filter,
		stmt, filter.UserId, filter.Name, filter.Query, filter.WithPictures, filter.SortBy, filter.SortDir)
	if err != nil {
		return err
	}

	err = d.SetSearchFilterFieldsTx(*filter.Id, filter.Fields, tx)
	if err != nil {
		return err
	}

	err = d.SetSearchFilterStatesTx(*filter.Id, filter.States, tx)
	if err != nil {
		return err
	}

	err = d.SetSearchFilterTagsTx(*filter.Id, filter.Tags, tx)
	if err != nil {
		return err
	}

	return nil
}
