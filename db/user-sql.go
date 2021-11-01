package db

import (
	"database/sql"
	"errors"
	"fmt"

	"github.com/chadweimer/gomp/generated/models"
	"github.com/jmoiron/sqlx"
	"golang.org/x/crypto/bcrypt"
)

type sqlUserDriver struct {
	*sqlDriver
}

func (d *sqlUserDriver) Authenticate(username, password string) (*models.User, error) {
	user := new(UserWithPasswordHash)

	if err := d.Db.Get(user, "SELECT * FROM app_user WHERE username = $1", username); err != nil {
		return nil, err
	}

	if err := d.verifyPassword(user, password); err != nil {
		return nil, err
	}

	return &user.User, nil
}

func (d *sqlUserDriver) Create(user *UserWithPasswordHash) error {
	return d.tx(func(tx *sqlx.Tx) error {
		return d.createtx(user, tx)
	})
}

func (d *sqlUserDriver) createtx(user *UserWithPasswordHash, tx *sqlx.Tx) error {
	stmt := "INSERT INTO app_user (username, password_hash, access_level) " +
		"VALUES ($1, $2, $3)"

	res, err := tx.Exec(stmt, user.Username, user.PasswordHash, user.AccessLevel)
	if err != nil {
		return err
	}
	userId, _ := res.LastInsertId()
	user.Id = &userId

	return nil
}

func (d *sqlUserDriver) Read(id int64) (*UserWithPasswordHash, error) {
	user := new(UserWithPasswordHash)

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
		user.Username, user.AccessLevel, user.Id)
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
		return errors.New("invalid password specified")
	}

	_, err = tx.Exec("UPDATE app_user SET password_hash = $1 WHERE ID = $2",
		newPasswordHash, user.Id)
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
		settings.HomeTitle, settings.HomeImageUrl, settings.UserId)
	if err != nil {
		return err
	}

	// Deleting and recreating seems inefficient. Maybe make this smarter.
	_, err = tx.Exec(
		"DELETE FROM app_user_favorite_tag WHERE user_id = $1",
		settings.UserId)
	if err != nil {
		return fmt.Errorf("deleting favorite tags before updating on user: %v", err)
	}
	for _, tag := range settings.FavoriteTags {
		_, err = tx.Exec(
			"INSERT INTO app_user_favorite_tag (user_id, tag) VALUES ($1, $2)",
			settings.UserId, tag)
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

	if err := d.Db.Select(&users, "SELECT id, username, access_level FROM app_user ORDER BY username ASC"); err != nil {
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
		stmt, filter.UserId, filter.Name, filter.Query, filter.WithPictures, filter.SortBy, filter.SortDir)
	if err != nil {
		return err
	}
	filterId, _ := res.LastInsertId()
	filter.Id = &filterId

	err = d.SetSearchFilterFieldsTx(filterId, filter.Fields, tx)
	if err != nil {
		return err
	}

	err = d.SetSearchFilterStatesTx(filterId, filter.States, tx)
	if err != nil {
		return err
	}

	err = d.SetSearchFilterTagsTx(filterId, filter.Tags, tx)
	if err != nil {
		return err
	}

	return nil
}

func (d *sqlUserDriver) SetSearchFilterFieldsTx(filterId int64, fields []models.SearchField, tx *sqlx.Tx) error {
	// Deleting and recreating seems inefficient. Maybe make this smarter.
	_, err := tx.Exec("DELETE FROM search_filter_field WHERE search_filter_id = $1", filterId)
	if err != nil {
		return err
	}

	for _, field := range fields {
		_, err := tx.Exec(
			"INSERT INTO search_filter_field (search_filter_id, field_name) VALUES ($1, $2)",
			filterId, field)
		if err != nil {
			return err
		}
	}

	return nil
}

func (d *sqlUserDriver) SetSearchFilterStatesTx(filterId int64, states []models.RecipeState, tx *sqlx.Tx) error {
	// Deleting and recreating seems inefficient. Maybe make this smarter.
	_, err := tx.Exec("DELETE FROM search_filter_state WHERE search_filter_id = $1", filterId)
	if err != nil {
		return err
	}

	for _, state := range states {
		_, err := tx.Exec(
			"INSERT INTO search_filter_state (search_filter_id, state) VALUES ($1, $2)",
			filterId, state)
		if err != nil {
			return err
		}
	}

	return nil
}

func (d *sqlUserDriver) SetSearchFilterTagsTx(filterId int64, tags []string, tx *sqlx.Tx) error {
	// Deleting and recreating seems inefficient. Maybe make this smarter.
	_, err := tx.Exec("DELETE FROM search_filter_tag WHERE search_filter_id = $1", filterId)
	if err != nil {
		return err
	}

	for _, tag := range tags {
		_, err := tx.Exec(
			"INSERT INTO search_filter_tag (search_filter_id, tag) VALUES ($1, $2)",
			filterId, tag)
		if err != nil {
			return err
		}
	}

	return nil
}

func (d *sqlUserDriver) ReadSearchFilter(userId int64, filterId int64) (*models.SavedSearchFilter, error) {
	var filter *models.SavedSearchFilter
	err := d.tx(func(tx *sqlx.Tx) error {
		var theErr error
		filter, theErr = d.readSearchFilterTx(userId, filterId, tx)
		return theErr
	})

	return filter, err
}

func (d *sqlUserDriver) readSearchFilterTx(userId int64, filterId int64, tx *sqlx.Tx) (*models.SavedSearchFilter, error) {
	filter := new(models.SavedSearchFilter)

	err := tx.Get(filter, "SELECT * FROM search_filter WHERE id = $1 AND user_id = $2", filterId, userId)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	} else if err != nil {
		return nil, err
	}

	var fields []models.SearchField
	err = tx.Select(
		&fields,
		"SELECT field_name FROM search_filter_field WHERE search_filter_id = $1",
		filterId)
	if err != nil && err != sql.ErrNoRows {
		return nil, err
	}
	filter.Fields = fields

	var states []models.RecipeState
	err = tx.Select(
		&states,
		"SELECT state FROM search_filter_state WHERE search_filter_id = $1",
		filterId)
	if err != nil && err != sql.ErrNoRows {
		return nil, err
	}
	filter.States = states

	var tags []string
	err = tx.Select(
		&tags,
		"SELECT tag FROM search_filter_tag WHERE search_filter_id = $1",
		filterId)
	if err != nil && err != sql.ErrNoRows {
		return nil, err
	}
	filter.Tags = tags

	return filter, nil
}

func (d *sqlUserDriver) UpdateSearchFilter(filter *models.SavedSearchFilter) error {
	return d.tx(func(tx *sqlx.Tx) error {
		return d.updateSearchFilterTx(filter, tx)
	})
}

func (d *sqlUserDriver) updateSearchFilterTx(filter *models.SavedSearchFilter, tx *sqlx.Tx) error {
	if filter.Id == nil {
		return errors.New("filter id is required")
	}
	if filter.UserId == nil {
		return errors.New("user id is required")
	}

	// Make sure the filter exists, which is important to confirm the filter is owned by the specified user
	if _, err := d.readSearchFilterTx(*filter.UserId, *filter.Id, tx); err != nil {
		return err
	}

	stmt := "UPDATE search_filter SET name = $1, query = $2, with_pictures = $3, sort_by = $4, sort_dir = $5 " +
		"WHERE id = $6 AND user_id = $7"

	_, err := tx.Exec(
		stmt, filter.Name, filter.Query, filter.WithPictures, filter.SortBy, filter.SortDir, filter.Id, filter.UserId)
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

func (d *sqlUserDriver) DeleteSearchFilter(userId int64, filterId int64) error {
	return d.tx(func(tx *sqlx.Tx) error {
		return d.deleteSearchFilterTx(userId, filterId, tx)
	})
}

func (d *sqlUserDriver) deleteSearchFilterTx(userId int64, filterId int64, tx *sqlx.Tx) error {
	_, err := tx.Exec("DELETE FROM search_filter WHERE id = $1 AND user_id = $2", filterId, userId)
	if err == sql.ErrNoRows {
		return ErrNotFound
	}
	return err
}

// List retrieves all user's saved search filters.
func (d *sqlUserDriver) ListSearchFilters(userId int64) (*[]models.SavedSearchFilterCompact, error) {
	var filters []models.SavedSearchFilterCompact

	err := d.Db.Select(
		&filters,
		"SELECT id, user_id, name FROM search_filter WHERE user_id = $1 ORDER BY name ASC",
		userId)
	if err != nil {
		return nil, err
	}

	return &filters, nil
}

func (d *sqlUserDriver) verifyPassword(user *UserWithPasswordHash, password string) error {
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return errors.New("username or password invalid")
	}

	return nil
}
