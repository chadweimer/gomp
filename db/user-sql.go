package db

import (
	"context"
	"errors"

	"github.com/chadweimer/gomp/models"
	"github.com/jmoiron/sqlx"
	"golang.org/x/crypto/bcrypt"
)

type sqlUserDriver struct {
	Db *sqlx.DB
}

func (d *sqlUserDriver) Authenticate(ctx context.Context, username, password string) (*models.User, error) {
	return get(d.Db, func(db sqlx.QueryerContext) (*models.User, error) {
		user := new(UserWithPasswordHash)

		if err := sqlx.GetContext(ctx, db, user, "SELECT * FROM app_user WHERE username = $1", username); err != nil {
			return nil, err
		}

		if !verifyPassword([]byte(user.PasswordHash), password) {
			return nil, ErrAuthenticationFailed
		}

		return &user.User, nil
	})
}

func (d *sqlUserDriver) Create(ctx context.Context, user *models.User, password string) error {
	return tx(ctx, d.Db, func(db *sqlx.Tx) error {
		return d.createImpl(ctx, user, password, db)
	})
}

func (*sqlUserDriver) createImpl(ctx context.Context, user *models.User, password string, db sqlx.QueryerContext) error {
	passwordHash, err := hashPassword(password)
	if err != nil {
		return errors.New("invalid password specified")
	}

	stmt := "INSERT INTO app_user (username, password_hash, access_level) " +
		"VALUES ($1, $2, $3) RETURNING id"

	return sqlx.GetContext(ctx, db, user, stmt, user.Username, passwordHash, user.AccessLevel)
}

func (d *sqlUserDriver) Read(ctx context.Context, id int64) (*UserWithPasswordHash, error) {
	return get(d.Db, func(db sqlx.QueryerContext) (*UserWithPasswordHash, error) {
		return d.readImpl(ctx, id, db)
	})
}

func (*sqlUserDriver) readImpl(ctx context.Context, id int64, db sqlx.QueryerContext) (*UserWithPasswordHash, error) {
	user := new(UserWithPasswordHash)

	if err := sqlx.GetContext(ctx, db, user, "SELECT * FROM app_user WHERE id = $1", id); err != nil {
		return nil, err
	}

	return user, nil
}

func (d *sqlUserDriver) Update(ctx context.Context, user *models.User) error {
	return tx(ctx, d.Db, func(db *sqlx.Tx) error {
		return d.updateImpl(ctx, user, db)
	})
}

func (*sqlUserDriver) updateImpl(ctx context.Context, user *models.User, db sqlx.ExecerContext) error {
	_, err := db.ExecContext(ctx, "UPDATE app_user SET username = $1, access_level = $2 WHERE ID = $3",
		user.Username, user.AccessLevel, user.ID)
	return err
}

func (d *sqlUserDriver) UpdatePassword(ctx context.Context, id int64, password, newPassword string) error {
	return tx(ctx, d.Db, func(db *sqlx.Tx) error {
		return d.updatePasswordImpl(ctx, id, password, newPassword, db)
	})
}

func (d *sqlUserDriver) updatePasswordImpl(ctx context.Context, id int64, password, newPassword string, db sqlx.ExtContext) error {
	// Make sure the current password is correct
	user, err := d.readImpl(ctx, id, db)
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

	_, err = db.ExecContext(ctx, "UPDATE app_user SET password_hash = $1 WHERE ID = $2",
		newPasswordHash, user.ID)
	return err
}

func (d *sqlUserDriver) Delete(ctx context.Context, id int64) error {
	return tx(ctx, d.Db, func(db *sqlx.Tx) error {
		return d.deleteImpl(ctx, id, db)
	})
}

func (*sqlUserDriver) deleteImpl(ctx context.Context, id int64, db sqlx.ExecerContext) error {
	_, err := db.ExecContext(ctx, "DELETE FROM app_user WHERE id = $1", id)
	return err
}

func (d *sqlUserDriver) List(ctx context.Context) (*[]models.User, error) {
	return get(d.Db, func(db sqlx.QueryerContext) (*[]models.User, error) {
		return d.listImpl(ctx, db)
	})
}

func (*sqlUserDriver) listImpl(ctx context.Context, db sqlx.QueryerContext) (*[]models.User, error) {
	users := make([]models.User, 0)

	if err := sqlx.SelectContext(ctx, db, &users, "SELECT id, username, access_level, created_at, modified_at FROM app_user ORDER BY username ASC"); err != nil {
		return nil, err
	}

	return &users, nil
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
