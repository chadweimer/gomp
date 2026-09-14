package cmds

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/chadweimer/gomp/config"
	"github.com/chadweimer/gomp/db"
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
						Action: migrateDatabaseUp(cfg),
					},
					{
						Name:  "down",
						Usage: "Migrate the database down by the specified number of steps (default 1)",
						Flags: []cli.Flag{
							&cli.IntFlag{
								Name:  "steps",
								Usage: "Number of steps to migrate down",
								Value: 1,
							},
						},
						Action: migrateDatabaseDown(cfg),
					},
				},
			},
		},
	}
}

func migrateDatabaseUp(cfg config.Config) func(context.Context, *cli.Command) error {
	return func(_ context.Context, _ *cli.Command) error {
		slog.Info("Migrating database up")

		dbDriver, err := db.CreateDriver(cfg.Database)
		if err != nil {
			return fmt.Errorf("establishing database driver: %w", err)
		}
		defer dbDriver.Close()

		if err := dbDriver.MigrateUp(); err == nil {
			slog.Info("Database migrated up successfully")
		}

		return err
	}
}

func migrateDatabaseDown(cfg config.Config) func(context.Context, *cli.Command) error {
	return func(_ context.Context, cmd *cli.Command) error {
		steps := cmd.Int("steps")

		slog.Info("Migrating database down", "steps", steps)

		dbDriver, err := db.CreateDriver(cfg.Database)
		if err != nil {
			return fmt.Errorf("establishing database driver: %w", err)
		}
		defer dbDriver.Close()

		if err := dbDriver.MigrateDown(steps); err == nil {
			slog.Info("Database migrated down successfully")
		}

		return err
	}
}
