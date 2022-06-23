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
		return d.createImpl(user, tx)
	})
}

func (d *postgresUserDriver) createImpl(user *UserWithPasswordHash, db sqlx.Queryer) error {
	stmt := "INSERT INTO app_user (username, password_hash, access_level) " +
		"VALUES ($1, $2, $3) RETURNING id"

	return sqlx.Get(db, user, stmt, user.Username, user.PasswordHash, user.AccessLevel)
}

func (d *postgresUserDriver) CreateSearchFilter(filter *models.SavedSearchFilter) error {
	return d.tx(func(tx *sqlx.Tx) error {
		return d.createSearchFilterImpl(filter, tx)
	})
}

func (d *postgresUserDriver) createSearchFilterImpl(filter *models.SavedSearchFilter, db sqlx.Ext) error {
	if filter.UserId == nil {
		return errors.New("user id is required")
	}

	stmt := "INSERT INTO search_filter (user_id, name, query, with_pictures, sort_by, sort_dir) " +
		"VALUES ($1, $2, $3, $4, $5, $6) RETURNING id"

	err := sqlx.Get(db, filter,
		stmt, filter.UserId, filter.Name, filter.Query, filter.WithPictures, filter.SortBy, filter.SortDir)
	if err != nil {
		return err
	}

	err = d.setSearchFilterFieldsImpl(*filter.Id, filter.Fields, db)
	if err != nil {
		return err
	}

	err = d.setSearchFilterStatesImpl(*filter.Id, filter.States, db)
	if err != nil {
		return err
	}

	err = d.setSearchFilterTagsImpl(*filter.Id, filter.Tags, db)
	if err != nil {
		return err
	}

	return nil
}
