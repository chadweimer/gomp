package cmds

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/chadweimer/gomp/config"
	"github.com/chadweimer/gomp/db"
	"github.com/golang-migrate/migrate/v4"
	"github.com/urfave/cli/v3"
)

func databaseCmd(cfg config.Config) *cli.Command {
	return &cli.Command{
		Name:  "db",
		Usage: "Database related commands",
		Commands: []*cli.Command{
			{
				Name:  "migrate",
				Usage: "Run database migrations",
				Commands: []*cli.Command{
					{
						Name:   "up",
						Usage:  "Migrate the database up by applying all pending migrations",
						Action: withDatabase(cfg, migrateDatabaseUp),
					},
					{
						Name:  "down",
						Usage: "Migrate the database down by the specified number of steps (default 1)",
						Flags: []cli.Flag{
							&cli.Uint16Flag{
								Name:  "steps",
								Usage: "Number of steps to migrate down",
								Value: 1,
							},
						},
						Action: withDatabase(cfg, migrateDatabaseDown),
					},
				},
			},
		},
	}
}

func withDatabase(cfg config.Config, op func(_ context.Context, _ *cli.Command, dbDriver db.Driver) error) func(_ context.Context, _ *cli.Command) error {
	return func(ctx context.Context, cmd *cli.Command) error {
		dbDriver, err := db.CreateDriver(cfg.Database)
		if err != nil {
			return fmt.Errorf("establishing database driver: %w", err)
		}
		defer dbDriver.Close()

		return op(ctx, cmd, dbDriver)
	}
}

func migrateDatabaseUp(_ context.Context, _ *cli.Command, dbDriver db.Driver) error {
	slog.Info("Migrating database up")

	err := dbDriver.MigrateUp()
	switch err {
	case nil:
		slog.Info("Database migrated up successfully")
		return nil
	case migrate.ErrNoChange:
		slog.Info("No changes to migrate up")
		return nil
	default:
		return err
	}
}

func migrateDatabaseDown(_ context.Context, cmd *cli.Command, dbDriver db.Driver) error {
	steps := cmd.Uint16("steps")
	slog.Info("Migrating database down", "steps", steps)

	err := dbDriver.MigrateDown(steps)
	switch err {
	case nil:
		slog.Info("Database migrated down successfully")
		return nil
	case migrate.ErrNoChange:
		slog.Info("No changes to migrate down")
		return nil
	default:
		return err
	}
}
