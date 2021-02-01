package db

import (
	"database/sql"
	"errors"
	"fmt"

	"github.com/chadweimer/gomp/models"
	"github.com/jmoiron/sqlx"
	"golang.org/x/crypto/bcrypt"
)

type sqlUserDriver struct {
	*sqlDriver
}

func (d *sqlUserDriver) Authenticate(username, password string) (*models.User, error) {
	user := new(models.User)

	if err := d.Db.Get(user, "SELECT * FROM app_user WHERE username = $1", username); err != nil {
		return nil, err
	}

	if err := d.verifyPassword(user, password); err != nil {
		return nil, err
	}

	return user, nil
}

func (d *sqlUserDriver) Create(user *models.User) error {
	return d.tx(func(tx *sqlx.Tx) error {
		return d.createtx(user, tx)
	})
}

func (d *sqlUserDriver) createtx(user *models.User, tx *sqlx.Tx) error {
	stmt := "INSERT INTO app_user (username, password_hash, access_level) " +
		"VALUES ($1, $2, $3)"

	res, err := tx.Exec(stmt, user.Username, user.PasswordHash, user.AccessLevel)
	if err != nil {
		return err
	}
	user.ID, _ = res.LastInsertId()

	return nil
}

func (d *sqlUserDriver) Read(id int64) (*models.User, error) {
	user := new(models.User)

	err := d.Db.Get(user, "SELECT * FROM app_user WHERE id = $1", id)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	} else if err != nil {
		return nil, err
	}

	return user, nil
}

func (d *sqlUserDriver) Update(user *models.User) error {
	return d.tx(func(tx *sqlx.Tx) error {
		return d.updatetx(user, tx)
	})
}

func (d *sqlUserDriver) updatetx(user *models.User, tx *sqlx.Tx) error {
	_, err := tx.Exec("UPDATE app_user SET username = $1, access_level = $2 WHERE ID = $3",
		user.Username, user.AccessLevel, user.ID)
	return err
}

func (d *sqlUserDriver) UpdatePassword(id int64, password, newPassword string) error {
	return d.tx(func(tx *sqlx.Tx) error {
		return d.updatePasswordtx(id, password, newPassword, tx)
	})
}

func (d *sqlUserDriver) updatePasswordtx(id int64, password, newPassword string, tx *sqlx.Tx) error {
	// Make sure the current password is correct
	user, err := d.Read(id)
	if err != nil {
		return err
	}
	err = d.verifyPassword(user, password)
	if err != nil {
		return err
	}

	newPasswordHash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return errors.New("Invalid password specified")
	}

	_, err = tx.Exec("UPDATE app_user SET password_hash = $1 WHERE ID = $2",
		newPasswordHash, user.ID)
	return err
}

func (d *sqlUserDriver) ReadSettings(id int64) (*models.UserSettings, error) {
	userSettings := new(models.UserSettings)

	if err := d.Db.Get(userSettings, "SELECT * FROM app_user_settings WHERE user_id = $1", id); err != nil {
		return nil, err
	}

	var tags []string
	if err := d.Db.Select(&tags, "SELECT tag FROM app_user_favorite_tag WHERE user_id = $1 ORDER BY tag ASC", id); err != nil {
		return nil, err
	}
	userSettings.FavoriteTags = tags

	return userSettings, nil
}

func (d *sqlUserDriver) UpdateSettings(settings *models.UserSettings) error {
	return d.tx(func(tx *sqlx.Tx) error {
		return d.updateSettingstx(settings, tx)
	})
}

func (d *sqlUserDriver) updateSettingstx(settings *models.UserSettings, tx *sqlx.Tx) error {
	_, err := tx.Exec(
		"UPDATE app_user_settings "+
			"SET home_title = $1, home_image_url = $2 WHERE user_id = $3",
		settings.HomeTitle, settings.HomeImageURL, settings.UserID)
	if err != nil {
		return err
	}

	// Deleting and recreating seems inefficient. Maybe make this smarter.
	_, err = tx.Exec(
		"DELETE FROM app_user_favorite_tag WHERE user_id = $1",
		settings.UserID)
	if err != nil {
		return fmt.Errorf("deleting favorite tags before updating on user: %v", err)
	}
	for _, tag := range settings.FavoriteTags {
		_, err = tx.Exec(
			"INSERT INTO app_user_favorite_tag (user_id, tag) VALUES ($1, $2)",
			settings.UserID, tag)
		if err != nil {
			return fmt.Errorf("updating favorite tags on user: %v", err)
		}
	}

	return nil
}

func (d *sqlUserDriver) Delete(id int64) error {
	return d.tx(func(tx *sqlx.Tx) error {
		return d.deletetx(id, tx)
	})
}

func (d *sqlUserDriver) deletetx(id int64, tx *sqlx.Tx) error {
	_, err := tx.Exec("DELETE FROM app_user WHERE id = $1", id)
	return err
}

func (d *sqlUserDriver) List() (*[]models.User, error) {
	var users []models.User

	if err := d.Db.Select(&users, "SELECT * FROM app_user ORDER BY username ASC"); err != nil {
		return nil, err
	}

	return &users, nil
}

func (d *sqlUserDriver) CreateSearchFilter(filter *models.SavedSearchFilter) error {
	return d.tx(func(tx *sqlx.Tx) error {
		return d.createSearchFilterTx(filter, tx)
	})
}

func (d *sqlUserDriver) createSearchFilterTx(filter *models.SavedSearchFilter, tx *sqlx.Tx) error {
	stmt := "INSERT INTO search_filter (user_id, name, query, with_pictures, sort_by, sort_dir) " +
		"VALUES ($1, $2, $3, $4, $5, $6)"

	res, err := tx.Exec(
		stmt, filter.UserID, filter.Name, filter.Query, filter.WithPictures, filter.SortBy, filter.SortDir)
	if err != nil {
		return err
	}
	filter.ID, _ = res.LastInsertId()

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

func (d *sqlUserDriver) SetSearchFilterFieldsTx(filterID int64, fields []string, tx *sqlx.Tx) error {
	// Deleting and recreating seems inefficient. Maybe make this smarter.
	_, err := d.Db.Exec("DELETE FROM search_filter_field WHERE search_filter_id = $1", filterID)
	if err != nil {
		return err
	}

	for _, field := range fields {
		_, err := d.Db.Exec(
			"INSERT INTO search_filter_field (search_filter_id, field) VALUES ($1, $2)",
			filterID, field)
		if err != nil {
			return err
		}
	}

	return nil
}

func (d *sqlUserDriver) SetSearchFilterStatesTx(filterID int64, states []string, tx *sqlx.Tx) error {
	// Deleting and recreating seems inefficient. Maybe make this smarter.
	_, err := d.Db.Exec("DELETE FROM search_filter_state WHERE search_filter_id = $1", filterID)
	if err != nil {
		return err
	}

	for _, state := range states {
		_, err := d.Db.Exec(
			"INSERT INTO search_filter_state (search_filter_id, state) VALUES ($1, $2)",
			filterID, state)
		if err != nil {
			return err
		}
	}

	return nil
}

func (d *sqlUserDriver) SetSearchFilterTagsTx(filterID int64, tags []string, tx *sqlx.Tx) error {
	// Deleting and recreating seems inefficient. Maybe make this smarter.
	_, err := d.Db.Exec("DELETE FROM search_filter_tag WHERE search_filter_id = $1", filterID)
	if err != nil {
		return err
	}

	for _, tag := range tags {
		_, err := d.Db.Exec(
			"INSERT INTO search_filter_tag (search_filter_id, tag) VALUES ($1, $2)",
			filterID, tag)
		if err != nil {
			return err
		}
	}

	return nil
}

func (d *sqlUserDriver) ReadSearchFilter(userID int64, filterID int64) (*models.SavedSearchFilter, error) {
	filter := new(models.SavedSearchFilter)

	err := d.Db.Get(filter, "SELECT * FROM search_filter WHERE id = $1 AND user_id = $2", filterID, userID)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	} else if err != nil {
		return nil, err
	}

	err = d.Db.Select(
		&filter.Fields,
		"SELECT field FROM search_filter_field WHERE search_filter_id = $1",
		filterID)
	if err != nil && err != sql.ErrNoRows {
		return nil, err
	}

	err = d.Db.Select(
		&filter.States,
		"SELECT state FROM search_filter_state WHERE search_filter_id = $1",
		filterID)
	if err != nil && err != sql.ErrNoRows {
		return nil, err
	}

	err = d.Db.Select(
		&filter.Tags,
		"SELECT tag FROM search_filter_tag WHERE search_filter_id = $1",
		filterID)
	if err != nil && err != sql.ErrNoRows {
		return nil, err
	}

	return filter, nil
}

func (d *sqlUserDriver) UpdateSearchFilter(filter *models.SavedSearchFilter) error {
	return d.tx(func(tx *sqlx.Tx) error {
		return d.updateSearchFilterTx(filter, tx)
	})
}

func (d *sqlUserDriver) updateSearchFilterTx(filter *models.SavedSearchFilter, tx *sqlx.Tx) error {
	// Make sure the filter exists, which is important to confirm the filter is owned by the specified user
	if _, err := d.ReadSearchFilter(filter.UserID, filter.ID); err == sql.ErrNoRows {
		return ErrNotFound
	}

	stmt := "UPDATE search_filter SET name = $3, query = $4, with_pictures = $5, sort_by = $6, sort_dir = $7) " +
		"WHERE id = $1 AND user_id = $2"

	_, err := tx.Exec(
		stmt, filter.ID, filter.UserID, filter.Name, filter.Query, filter.WithPictures, filter.SortBy, filter.SortDir)
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

func (d *sqlUserDriver) DeleteSearchFilter(userID int64, filterID int64) error {
	return d.tx(func(tx *sqlx.Tx) error {
		return d.deleteSearchFilterTx(userID, filterID, tx)
	})
}

func (d *sqlUserDriver) deleteSearchFilterTx(userID int64, filterID int64, tx *sqlx.Tx) error {
	_, err := tx.Exec("DELETE FROM search_filter WHERE id = $1 AND user_id = $2", filterID, userID)
	if err == sql.ErrNoRows {
		return ErrNotFound
	}
	return err
}

// List retrieves all user's saved search filters.
func (d *sqlUserDriver) ListSearchFilters(userID int64) (*[]models.SavedSearchFilter, error) {
	var filters []models.SavedSearchFilter

	err := d.Db.Select(
		&filters,
		"SELECT * FROM search_filter WHERE user_id = $1 ORDER BY name ASC",
		userID)
	if err != nil {
		return nil, err
	}

	return &filters, nil
}

func (d *sqlUserDriver) verifyPassword(user *models.User, password string) error {
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return errors.New("username or password invalid")
	}

	return nil
}
