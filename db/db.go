package db

import (
	"database/sql"
	"errors"
)

func mapSqlErrors(err error) error {
	if errors.Is(err, sql.ErrNoRows) {
		return ErrNotFound
	}

	return err
}
