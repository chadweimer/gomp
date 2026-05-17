package db

import (
	"context"
	"database/sql"

	"github.com/chadweimer/gomp/models"
	"github.com/jmoiron/sqlx"
)

type sqlUserSearchFilterDriver struct {
	Db *sqlx.DB
}

func (d *sqlUserSearchFilterDriver) Create(ctx context.Context, filter *models.SavedSearchFilter) error {
	return tx(ctx, d.Db, func(db *sqlx.Tx) error {
		return d.createImpl(ctx, filter, db)
	})
}

func (d *sqlUserSearchFilterDriver) createImpl(ctx context.Context, filter *models.SavedSearchFilter, db sqlx.ExtContext) error {
	if filter.UserID == nil {
		return ErrMissingID
	}

	stmt := "INSERT INTO search_filter (user_id, name, query, with_pictures, sort_by, sort_dir) " +
		"VALUES ($1, $2, $3, $4, $5, $6) RETURNING id"

	err := sqlx.GetContext(ctx, db, filter,
		stmt, filter.UserID, filter.Name, filter.Query, filter.WithPictures, filter.SortBy, filter.SortDir)
	if err != nil {
		return err
	}

	if err = d.setFieldsImpl(ctx, *filter.ID, filter.Fields, db); err != nil {
		return err
	}

	if err = d.setStatesImpl(ctx, *filter.ID, filter.States, db); err != nil {
		return err
	}

	return d.setTagsImpl(ctx, *filter.ID, filter.Tags, db)
}

func (*sqlUserSearchFilterDriver) setFieldsImpl(ctx context.Context, filterID int64, fields []models.SearchField, db sqlx.ExecerContext) error {
	// Deleting and recreating seems inefficient. Maybe make this smarter.
	if _, err := db.ExecContext(ctx, "DELETE FROM search_filter_field WHERE search_filter_id = $1", filterID); err != nil {
		return err
	}

	for _, field := range fields {
		_, err := db.ExecContext(ctx,
			"INSERT INTO search_filter_field (search_filter_id, field_name) VALUES ($1, $2)",
			filterID, field)
		if err != nil {
			return err
		}
	}

	return nil
}

func (*sqlUserSearchFilterDriver) setStatesImpl(ctx context.Context, filterID int64, states []models.RecipeState, db sqlx.ExecerContext) error {
	// Deleting and recreating seems inefficient. Maybe make this smarter.
	if _, err := db.ExecContext(ctx, "DELETE FROM search_filter_state WHERE search_filter_id = $1", filterID); err != nil {
		return err
	}

	for _, state := range states {
		_, err := db.ExecContext(ctx,
			"INSERT INTO search_filter_state (search_filter_id, state) VALUES ($1, $2)",
			filterID, state)
		if err != nil {
			return err
		}
	}

	return nil
}

func (*sqlUserSearchFilterDriver) setTagsImpl(ctx context.Context, filterID int64, tags []string, db sqlx.ExecerContext) error {
	// Deleting and recreating seems inefficient. Maybe make this smarter.
	if _, err := db.ExecContext(ctx, "DELETE FROM search_filter_tag WHERE search_filter_id = $1", filterID); err != nil {
		return err
	}

	for _, tag := range tags {
		_, err := db.ExecContext(ctx,
			"INSERT INTO search_filter_tag (search_filter_id, tag) VALUES ($1, $2)",
			filterID, tag)
		if err != nil {
			return err
		}
	}

	return nil
}

func (d *sqlUserSearchFilterDriver) Read(ctx context.Context, userID int64, filterID int64) (*models.SavedSearchFilter, error) {
	return get(d.Db, func(db sqlx.QueryerContext) (*models.SavedSearchFilter, error) {
		return d.readImpl(ctx, userID, filterID, db)
	})
}

func (*sqlUserSearchFilterDriver) readImpl(ctx context.Context, userID int64, filterID int64, db sqlx.QueryerContext) (*models.SavedSearchFilter, error) {
	filter := new(models.SavedSearchFilter)

	if err := sqlx.GetContext(ctx, db, filter, "SELECT * FROM search_filter WHERE id = $1 AND user_id = $2", filterID, userID); err != nil {
		return nil, err
	}

	fields := make([]models.SearchField, 0)
	if err := sqlx.SelectContext(
		ctx,
		db,
		&fields,
		"SELECT field_name FROM search_filter_field WHERE search_filter_id = $1",
		filterID); err != nil && err != sql.ErrNoRows {
		return nil, err
	}
	filter.Fields = fields

	states := make([]models.RecipeState, 0)
	if err := sqlx.SelectContext(
		ctx,
		db,
		&states,
		"SELECT state FROM search_filter_state WHERE search_filter_id = $1",
		filterID); err != nil && err != sql.ErrNoRows {
		return nil, err
	}
	filter.States = states

	tags := make([]string, 0)
	if err := sqlx.SelectContext(
		ctx,
		db,
		&tags,
		"SELECT tag FROM search_filter_tag WHERE search_filter_id = $1",
		filterID); err != nil && err != sql.ErrNoRows {
		return nil, err
	}
	filter.Tags = tags

	return filter, nil
}

func (d *sqlUserSearchFilterDriver) Update(ctx context.Context, filter *models.SavedSearchFilter) error {
	return tx(ctx, d.Db, func(db *sqlx.Tx) error {
		return d.updateImpl(ctx, filter, db)
	})
}

func (d *sqlUserSearchFilterDriver) updateImpl(ctx context.Context, filter *models.SavedSearchFilter, db sqlx.ExtContext) error {
	if filter.ID == nil {
		return ErrMissingID
	}
	if filter.UserID == nil {
		return ErrMissingID
	}

	// Make sure the filter exists, which is important to confirm the filter is owned by the specified user
	var id int64
	if err := sqlx.GetContext(ctx, db, &id, "SELECT id FROM search_filter WHERE id = $1 AND user_id = $2", filter.ID, filter.UserID); err != nil {
		return err
	}

	stmt := "UPDATE search_filter SET name = $1, query = $2, with_pictures = $3, sort_by = $4, sort_dir = $5 " +
		"WHERE id = $6 AND user_id = $7"

	_, err := db.ExecContext(
		ctx, stmt, filter.Name, filter.Query, filter.WithPictures, filter.SortBy, filter.SortDir, filter.ID, filter.UserID)
	if err != nil {
		return err
	}

	if err = d.setFieldsImpl(ctx, *filter.ID, filter.Fields, db); err != nil {
		return err
	}

	if err = d.setStatesImpl(ctx, *filter.ID, filter.States, db); err != nil {
		return err
	}

	return d.setTagsImpl(ctx, *filter.ID, filter.Tags, db)
}

func (d *sqlUserSearchFilterDriver) Delete(ctx context.Context, userID int64, filterID int64) error {
	return tx(ctx, d.Db, func(db *sqlx.Tx) error {
		return d.deleteImpl(ctx, userID, filterID, db)
	})
}

func (*sqlUserSearchFilterDriver) deleteImpl(ctx context.Context, userID int64, filterID int64, db sqlx.ExecerContext) error {
	_, err := db.ExecContext(ctx, "DELETE FROM search_filter WHERE id = $1 AND user_id = $2", filterID, userID)
	return err
}

// List retrieves all user's saved search filters.
func (d *sqlUserSearchFilterDriver) List(ctx context.Context, userID int64) (*[]models.SavedSearchFilterCompact, error) {
	return get(d.Db, func(db sqlx.QueryerContext) (*[]models.SavedSearchFilterCompact, error) {
		filters := make([]models.SavedSearchFilterCompact, 0)

		err := sqlx.SelectContext(
			ctx,
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
