package db

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/chadweimer/gomp/models"
	"github.com/jmoiron/sqlx"
)

type sqlBackupDriver struct {
	db *sqlx.DB
}

func (b *sqlBackupDriver) Export() (*models.Backup, error) {
	backup := models.Backup(make([]models.TableData, 0))
	err := tx(b.db, func(db *sqlx.Tx) error {
		// Get all table names
		tables := make([]string, 0)
		if err := sqlx.Select(db, &tables, "SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%'"); err != nil {
			return err
		}

		// Process each table
		for _, tableName := range tables {
			rowData, err := getRows(db, tableName)
			if err != nil {
				return err
			}

			backup = append(backup, models.TableData{
				TableName: tableName,
				Data:      rowData,
			})
		}

		return nil
	})
	if err != nil {
		return nil, fmt.Errorf("exporting database: %w", err)
	}

	return &backup, nil
}

func (b *sqlBackupDriver) Import(backup *models.Backup) error {
	// Import data from all tables in the backup
	err := tx(b.db, func(db *sqlx.Tx) error {
		for _, tableData := range *backup {
			sanitizedTableName, err := sanitizeIdentifier(tableData.TableName)
			if err != nil {
				return fmt.Errorf("sanitizing table name %s: %w", tableData.TableName, err)
			}

			if _, err := db.Exec(fmt.Sprintf("DELETE FROM %s", sanitizedTableName)); err != nil {
				return fmt.Errorf("deleting from table %s: %w", sanitizedTableName, err)
			}

			if err := insertRows(db, sanitizedTableName, tableData.Data); err != nil {
				return fmt.Errorf("importing table %s: %w", sanitizedTableName, err)
			}
		}
		return nil
	})
	if err != nil {
		return fmt.Errorf("importing database: %w", err)
	}
	return nil
}

func getRows(db sqlx.Queryer, tableName string) ([]models.RowData, error) {
	rows, err := db.Queryx(fmt.Sprintf("SELECT * FROM %s", tableName))
	if err != nil {
		return nil, fmt.Errorf("querying %s: %w", tableName, err)
	}
	defer rows.Close()

	data := make([]models.RowData, 0)
	for rows.Next() {
		row := models.RowData{}
		if err := rows.MapScan(row); err != nil {
			return nil, fmt.Errorf("scanning row: %w", err)
		}
		data = append(data, row)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating over rows: %w", err)
	}
	return data, nil
}

func insertRows(db *sqlx.Tx, tableName string, rowData []models.RowData) error {
	// Check if there is anything to insert
	if len(rowData) == 0 {
		return nil
	}

	// Get column names from the first row
	columns := make([]string, 0, len(rowData[0]))
	placeholders := make([]string, 0, len(columns))
	for key := range rowData[0] {
		sanitizedColumnName, err := sanitizeIdentifier(key)
		if err != nil {
			return fmt.Errorf("sanitizing column name %s for table %s: %w", key, tableName, err)
		}
		columns = append(columns, sanitizedColumnName)
		placeholders = append(placeholders, ":"+sanitizedColumnName)
	}

	insertQuery := fmt.Sprintf("INSERT INTO %s (%s) VALUES (%s)",
		tableName,
		strings.Join(columns, ","),
		strings.Join(placeholders, ","))

	// Prepare the statement
	stmt, err := db.PrepareNamed(insertQuery)
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, row := range rowData {
		_, err := stmt.Exec(row)
		if err != nil {
			return fmt.Errorf("inserting row into %s: %w", tableName, err)
		}
	}
	return nil
}

func sanitizeIdentifier(name string) (string, error) {
	// Regular expression to match valid SQL identifiers
	// (letters, numbers, underscores, hyphens, and dots)
	re := regexp.MustCompile(`^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)*$`)
	if !re.MatchString(name) {
		return "", fmt.Errorf("invalid identifier: %s", name)
	}
	return name, nil
}
