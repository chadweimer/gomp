package cmds

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"os"

	"github.com/chadweimer/gomp/config"
	"github.com/chadweimer/gomp/db"
	"github.com/chadweimer/gomp/models"
	"github.com/golang-migrate/migrate/v4"
	"github.com/urfave/cli/v3"
)

func databaseCmd(cfg config.Config) *cli.Command {
	return &cli.Command{
		Name:  "db",
		Usage: "Database related commands",
		Commands: []*cli.Command{
			{
				Name:  "export",
				Usage: "Export the database",
				Flags: []cli.Flag{
					&cli.StringFlag{
						Name:      "output",
						Aliases:   []string{"o"},
						Usage:     "Path to output JSON file for the exported database (required)",
						TakesFile: true,
						Required:  true,
					},
					&cli.BoolFlag{
						Name:  "pretty",
						Usage: "Pretty-print the exported JSON",
					},
				},
				Action: withDatabase(cfg, func(ctx context.Context, cmd *cli.Command, dbDriver db.Driver) error {
					output := cmd.String("output")
					indent := ""
					if cmd.Bool("pretty") {
						indent = "  "
					}
					root, err := os.OpenRoot(".")
					if err != nil {
						return err
					}
					return exportDatabase(ctx, dbDriver, func(name string) (io.WriteCloser, error) {
						return root.Create(name)
					}, output, indent)
				}),
			},
			{
				Name:  "import",
				Usage: "Import the database",
				Flags: []cli.Flag{
					&cli.StringFlag{
						Name:      "input",
						Aliases:   []string{"i"},
						Usage:     "Path to input JSON file for the database import (required)",
						TakesFile: true,
						Required:  true,
					},
				},
				Action: withDatabase(cfg, func(ctx context.Context, cmd *cli.Command, dbDriver db.Driver) error {
					input := cmd.String("input")
					root, err := os.OpenRoot(".")
					if err != nil {
						return err
					}
					return importDatabase(ctx, dbDriver, func(name string) (io.ReadCloser, error) {
						return root.Open(name)
					}, input)
				}),
			},
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
						Name:   "down",
						Usage:  "Migrate the database down down by applying all pending migrations",
						Action: withDatabase(cfg, migrateDatabaseDown),
					},
					{
						Name:  "steps",
						Usage: "Migrate the database by the specified number of steps. The steps can be positive (up) or negative (down) (default 1)",
						Flags: []cli.Flag{
							&cli.IntFlag{
								Name:  "steps",
								Usage: "Number of steps to migrate",
								Value: 1,
							},
						},
						Action: withDatabase(cfg, migrateDatabaseSteps),
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

func exportDatabase(ctx context.Context, dbDriver db.Driver, creator func(string) (io.WriteCloser, error), output, indent string) error {
	slog.Info("Exporting database", "output", output)

	backupData, err := dbDriver.Backups().Export(ctx)
	if err != nil {
		return fmt.Errorf("exporting database: %w", err)
	}

	f, err := creator(output)
	if err != nil {
		return err
	}
	defer f.Close()

	encoder := json.NewEncoder(f)
	encoder.SetIndent("", indent)
	err = encoder.Encode(backupData)
	if err != nil {
		return fmt.Errorf("writing exported database to file: %w", err)
	}

	slog.Info("Database exported successfully")
	return nil
}

func importDatabase(ctx context.Context, dbDriver db.Driver, opener func(string) (io.ReadCloser, error), input string) error {
	slog.Info("Importing database", "input", input)

	f, err := opener(input)
	if err != nil {
		return err
	}
	defer f.Close()

	backupData := new(models.BackupData)
	err = json.NewDecoder(f).Decode(backupData)
	if err != nil {
		return fmt.Errorf("decoding backup data: %w", err)
	}

	err = dbDriver.Backups().Import(ctx, backupData)
	if err != nil {
		return fmt.Errorf("importing database: %w", err)
	}

	slog.Info("Database imported successfully")
	return nil
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

func migrateDatabaseDown(_ context.Context, _ *cli.Command, dbDriver db.Driver) error {
	slog.Info("Migrating database down")

	err := dbDriver.MigrateDown()
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

func migrateDatabaseSteps(_ context.Context, cmd *cli.Command, dbDriver db.Driver) error {
	steps := cmd.Int("steps")
	slog.Info("Migrating database by steps", "steps", steps)

	err := dbDriver.MigrateSteps(steps)
	switch err {
	case nil:
		slog.Info("Database migrated successfully")
		return nil
	case migrate.ErrNoChange:
		slog.Info("No changes to migrate")
		return nil
	default:
		return err
	}
}
