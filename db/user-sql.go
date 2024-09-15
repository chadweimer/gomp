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
	Db *sqlx.DB
}

func (d *sqlUserDriver) Authenticate(username, password string) (*models.User, error) {
	return get(d.Db, func(db sqlx.Queryer) (*models.User, error) {
		user := new(UserWithPasswordHash)

		if err := sqlx.Get(db, user, "SELECT * FROM app_user WHERE username = $1", username); err != nil {
			return nil, err
		}

		if !verifyPassword([]byte(user.PasswordHash), password) {
			return nil, ErrAuthenticationFailed
		}

		return &user.User, nil
	})
}

func (d *sqlUserDriver) Create(user *models.User, password string) error {
	return tx(d.Db, func(db sqlx.Ext) error {
		return d.createImpl(user, password, db)
	})
}

func (*sqlUserDriver) createImpl(user *models.User, password string, db sqlx.Queryer) error {
	passwordHash, err := hashPassword(password)
	if err != nil {
		return errors.New("invalid password specified")
	}

	stmt := "INSERT INTO app_user (username, password_hash, access_level) " +
		"VALUES ($1, $2, $3) RETURNING id"

	return sqlx.Get(db, user, stmt, user.Username, passwordHash, user.AccessLevel)
}

func (d *sqlUserDriver) Read(id int64) (*UserWithPasswordHash, error) {
	return get(d.Db, func(db sqlx.Queryer) (*UserWithPasswordHash, error) {
		return d.readImpl(id, db)
	})
}

func (*sqlUserDriver) readImpl(id int64, db sqlx.Queryer) (*UserWithPasswordHash, error) {
	user := new(UserWithPasswordHash)

	if err := sqlx.Get(db, user, "SELECT * FROM app_user WHERE id = $1", id); err != nil {
		return nil, err
	}

	return user, nil
}

func (d *sqlUserDriver) Update(user *models.User) error {
	return tx(d.Db, func(db sqlx.Ext) error {
		return d.updateImpl(user, db)
	})
}

func (*sqlUserDriver) updateImpl(user *models.User, db sqlx.Execer) error {
	_, err := db.Exec("UPDATE app_user SET username = $1, access_level = $2 WHERE ID = $3",
		user.Username, user.AccessLevel, user.ID)
	return err
}

func (d *sqlUserDriver) UpdatePassword(id int64, password, newPassword string) error {
	return tx(d.Db, func(db sqlx.Ext) error {
		return d.updatePasswordImpl(id, password, newPassword, db)
	})
}

func (d *sqlUserDriver) updatePasswordImpl(id int64, password, newPassword string, db sqlx.Ext) error {
	// Make sure the current password is correct
	user, err := d.readImpl(id, db)
	if err != nil {
		return err
	}
	if !verifyPassword([]byte(user.PasswordHash), password) {
		return ErrAuthenticationFailed
	}

	newPasswordHash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return errors.New("invalid password specified")
	}

	_, err = db.Exec("UPDATE app_user SET password_hash = $1 WHERE ID = $2",
		newPasswordHash, user.ID)
	return err
}

func (d *sqlUserDriver) ReadSettings(id int64) (*models.UserSettings, error) {
	return get(d.Db, func(db sqlx.Queryer) (*models.UserSettings, error) {
		return d.readSettingsImpl(id, db)
	})
}

func (*sqlUserDriver) readSettingsImpl(id int64, db sqlx.Queryer) (*models.UserSettings, error) {
	userSettings := new(models.UserSettings)

	if err := sqlx.Get(db, userSettings, "SELECT * FROM app_user_settings WHERE user_id = $1", id); err != nil {
		return nil, err
	}

	tags := make([]string, 0)
	if err := sqlx.Select(db, &tags, "SELECT tag FROM app_user_favorite_tag WHERE user_id = $1 ORDER BY tag ASC", id); err != nil {
		return nil, err
	}
	userSettings.FavoriteTags = tags

	return userSettings, nil
}

func (d *sqlUserDriver) UpdateSettings(settings *models.UserSettings) error {
	return tx(d.Db, func(db sqlx.Ext) error {
		return d.updateSettingsImpl(settings, db)
	})
}

func (*sqlUserDriver) updateSettingsImpl(settings *models.UserSettings, db sqlx.Execer) error {
	_, err := db.Exec(
		"UPDATE app_user_settings "+
			"SET home_title = $1, home_image_url = $2 WHERE user_id = $3",
		settings.HomeTitle, settings.HomeImageURL, settings.UserID)
	if err != nil {
		return err
	}

	// Deleting and recreating seems inefficient. Maybe make this smarter.
	_, err = db.Exec(
		"DELETE FROM app_user_favorite_tag WHERE user_id = $1",
		settings.UserID)
	if err != nil {
		return fmt.Errorf("deleting favorite tags before updating on user: %w", err)
	}
	for _, tag := range settings.FavoriteTags {
		_, err = db.Exec(
			"INSERT INTO app_user_favorite_tag (user_id, tag) VALUES ($1, $2)",
			settings.UserID, tag)
		if err != nil {
			return fmt.Errorf("updating favorite tags on user: %w", err)
		}
	}

	return nil
}

func (d *sqlUserDriver) Delete(id int64) error {
	return tx(d.Db, func(db sqlx.Ext) error {
		return d.deleteImpl(id, db)
	})
}

func (*sqlUserDriver) deleteImpl(id int64, db sqlx.Execer) error {
	_, err := db.Exec("DELETE FROM app_user WHERE id = $1", id)
	return err
}

func (d *sqlUserDriver) List() (*[]models.User, error) {
	return get(d.Db, func(db sqlx.Queryer) (*[]models.User, error) {
		return d.listImpl(db)
	})
}

func (*sqlUserDriver) listImpl(db sqlx.Queryer) (*[]models.User, error) {
	users := make([]models.User, 0)

	if err := sqlx.Select(db, &users, "SELECT id, username, access_level, created_at, modified_at FROM app_user ORDER BY username ASC"); err != nil {
		return nil, err
	}

	return &users, nil
}

func (d *sqlUserDriver) CreateSearchFilter(filter *models.SavedSearchFilter) error {
	return tx(d.Db, func(db sqlx.Ext) error {
		return d.createSearchFilterImpl(filter, db)
	})
}

func (d *sqlUserDriver) createSearchFilterImpl(filter *models.SavedSearchFilter, db sqlx.Ext) error {
	if filter.UserID == nil {
		return ErrMissingID
	}

	stmt := "INSERT INTO search_filter (user_id, name, query, with_pictures, sort_by, sort_dir) " +
		"VALUES ($1, $2, $3, $4, $5, $6) RETURNING id"

	err := sqlx.Get(db, filter,
		stmt, filter.UserID, filter.Name, filter.Query, filter.WithPictures, filter.SortBy, filter.SortDir)
	if err != nil {
		return err
	}

	if err = d.setSearchFilterFieldsImpl(*filter.ID, filter.Fields, db); err != nil {
		return err
	}

	if err = d.setSearchFilterStatesImpl(*filter.ID, filter.States, db); err != nil {
		return err
	}

	return d.setSearchFilterTagsImpl(*filter.ID, filter.Tags, db)
}

func (*sqlUserDriver) setSearchFilterFieldsImpl(filterID int64, fields []models.SearchField, db sqlx.Execer) error {
	// Deleting and recreating seems inefficient. Maybe make this smarter.
	if _, err := db.Exec("DELETE FROM search_filter_field WHERE search_filter_id = $1", filterID); err != nil {
		return err
	}

	for _, field := range fields {
		_, err := db.Exec(
			"INSERT INTO search_filter_field (search_filter_id, field_name) VALUES ($1, $2)",
			filterID, field)
		if err != nil {
			return err
		}
	}

	return nil
}

func (*sqlUserDriver) setSearchFilterStatesImpl(filterID int64, states []models.RecipeState, db sqlx.Execer) error {
	// Deleting and recreating seems inefficient. Maybe make this smarter.
	if _, err := db.Exec("DELETE FROM search_filter_state WHERE search_filter_id = $1", filterID); err != nil {
		return err
	}

	for _, state := range states {
		_, err := db.Exec(
			"INSERT INTO search_filter_state (search_filter_id, state) VALUES ($1, $2)",
			filterID, state)
		if err != nil {
			return err
		}
	}

	return nil
}

func (*sqlUserDriver) setSearchFilterTagsImpl(filterID int64, tags []string, db sqlx.Execer) error {
	// Deleting and recreating seems inefficient. Maybe make this smarter.
	if _, err := db.Exec("DELETE FROM search_filter_tag WHERE search_filter_id = $1", filterID); err != nil {
		return err
	}

	for _, tag := range tags {
		_, err := db.Exec(
			"INSERT INTO search_filter_tag (search_filter_id, tag) VALUES ($1, $2)",
			filterID, tag)
		if err != nil {
			return err
		}
	}

	return nil
}

func (d *sqlUserDriver) ReadSearchFilter(userID int64, filterID int64) (*models.SavedSearchFilter, error) {
	return get(d.Db, func(db sqlx.Queryer) (*models.SavedSearchFilter, error) {
		return d.readSearchFilterImpl(userID, filterID, db)
	})
}

func (*sqlUserDriver) readSearchFilterImpl(userID int64, filterID int64, db sqlx.Queryer) (*models.SavedSearchFilter, error) {
	filter := new(models.SavedSearchFilter)

	if err := sqlx.Get(db, filter, "SELECT * FROM search_filter WHERE id = $1 AND user_id = $2", filterID, userID); err != nil {
		return nil, err
	}

	fields := make([]models.SearchField, 0)
	if err := sqlx.Select(
		db,
		&fields,
		"SELECT field_name FROM search_filter_field WHERE search_filter_id = $1",
		filterID); err != nil && err != sql.ErrNoRows {
		return nil, err
	}
	filter.Fields = fields

	states := make([]models.RecipeState, 0)
	if err := sqlx.Select(
		db,
		&states,
		"SELECT state FROM search_filter_state WHERE search_filter_id = $1",
		filterID); err != nil && err != sql.ErrNoRows {
		return nil, err
	}
	filter.States = states

	tags := make([]string, 0)
	if err := sqlx.Select(
		db,
		&tags,
		"SELECT tag FROM search_filter_tag WHERE search_filter_id = $1",
		filterID); err != nil && err != sql.ErrNoRows {
		return nil, err
	}
	filter.Tags = tags

	return filter, nil
}

func (d *sqlUserDriver) UpdateSearchFilter(filter *models.SavedSearchFilter) error {
	return tx(d.Db, func(db sqlx.Ext) error {
		return d.updateSearchFilterImpl(filter, db)
	})
}

func (d *sqlUserDriver) updateSearchFilterImpl(filter *models.SavedSearchFilter, db sqlx.Ext) error {
	if filter.ID == nil {
		return ErrMissingID
	}
	if filter.UserID == nil {
		return ErrMissingID
	}

	// Make sure the filter exists, which is important to confirm the filter is owned by the specified user
	var id int64
	if err := sqlx.Get(db, &id, "SELECT id FROM search_filter WHERE id = $1 AND user_id = $2", filter.ID, filter.UserID); err != nil {
		return err
	}

	stmt := "UPDATE search_filter SET name = $1, query = $2, with_pictures = $3, sort_by = $4, sort_dir = $5 " +
		"WHERE id = $6 AND user_id = $7"

	_, err := db.Exec(
		stmt, filter.Name, filter.Query, filter.WithPictures, filter.SortBy, filter.SortDir, filter.ID, filter.UserID)
	if err != nil {
		return err
	}

	if err = d.setSearchFilterFieldsImpl(*filter.ID, filter.Fields, db); err != nil {
		return err
	}

	if err = d.setSearchFilterStatesImpl(*filter.ID, filter.States, db); err != nil {
		return err
	}

	return d.setSearchFilterTagsImpl(*filter.ID, filter.Tags, db)
}

func (d *sqlUserDriver) DeleteSearchFilter(userID int64, filterID int64) error {
	return tx(d.Db, func(db sqlx.Ext) error {
		return d.deleteSearchFilterImpl(userID, filterID, db)
	})
}

func (*sqlUserDriver) deleteSearchFilterImpl(userID int64, filterID int64, db sqlx.Execer) error {
	_, err := db.Exec("DELETE FROM search_filter WHERE id = $1 AND user_id = $2", filterID, userID)
	return err
}

// List retrieves all user's saved search filters.
func (d *sqlUserDriver) ListSearchFilters(userID int64) (*[]models.SavedSearchFilterCompact, error) {
	return get(d.Db, func(db sqlx.Queryer) (*[]models.SavedSearchFilterCompact, error) {
		filters := make([]models.SavedSearchFilterCompact, 0)

		err := sqlx.Select(
			db,
			&filters,
			"SELECT id, user_id, name FROM search_filter WHERE user_id = $1 ORDER BY name ASC",
			userID)
		if err != nil {
			return nil, err
		}

		return &filters, nil
	})
}

func hashPassword(password string) ([]byte, error) {
	return bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
}

func verifyPassword(passwordHash []byte, password string) bool {
	if err := bcrypt.CompareHashAndPassword(passwordHash, []byte(password)); err != nil {
		return false
	}

	return true
}
