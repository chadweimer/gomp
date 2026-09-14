package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"

	"github.com/chadweimer/gomp/api"
	"github.com/chadweimer/gomp/db"
	"github.com/chadweimer/gomp/fileaccess"
	"github.com/chadweimer/gomp/middleware"
	"github.com/chadweimer/gomp/models"
	"github.com/urfave/cli/v3"
)

var rootCmd = &cli.Command{
	Commands: []*cli.Command{
		{
			Name:   "serve",
			Usage:  "Serve the application",
			Action: serverApplication,
		},
		{
			Name:  "db",
			Usage: "Database related commands",
			Commands: []*cli.Command{
				{
					Name:  "migrate",
					Usage: "Run database migrations",
					Commands: []*cli.Command{
						{
							Name:   "up",
							Usage:  "Apply all up migrations",
							Action: migrateDatabaseUp,
						},
						{
							Name:   "down",
							Usage:  "Apply all down migrations",
							Action: migrateDatabaseDown,
						},
					},
				},
			},
		},
		{
			Name:  "images",
			Usage: "Image related commands",
			Commands: []*cli.Command{
				{
					Name:   "optimize",
					Usage:  "Optimize images",
					Action: optimizeImages,
				},
			},
		},
	},
}

func serverApplication(ctx context.Context, _ *cli.Command) error {
	cfg, ok := ConfigFromContext(ctx)
	if !ok {
		return errors.New("failed to retrieve configuration from context")
	}

	fsDriver, err := fileaccess.CreateDriver(cfg.FileAccess.Files)
	if err != nil {
		return fmt.Errorf("establishing file access driver: %w", err)
	}
	fileServer := http.FileServerFS(fileaccess.OnlyFiles(fsDriver))

	uploader, err := fileaccess.CreateImageUploader(fsDriver, cfg.FileAccess.Image)
	if err != nil {
		return fmt.Errorf("establishing uploader: %w", err)
	}

	dbDriver, err := db.CreateDriver(cfg.Database)
	if err != nil {
		return fmt.Errorf("establishing database driver: %w", err)
	}
	defer dbDriver.Close()

	baseAssetsRoot, err := os.OpenRoot(cfg.BaseAssetsPath)
	if err != nil {
		return fmt.Errorf("opening base assets path: %w", err)
	}

	handlePrefixed := func(mux *http.ServeMux, prefix string, handler http.Handler) {
		mux.Handle(fmt.Sprintf("/%s/", prefix), handler)
	}
	handlePrefixStripped := func(mux *http.ServeMux, prefix string, handler http.Handler) {
		handlePrefixed(mux, prefix, http.StripPrefix(fmt.Sprintf("/%s", prefix), handler))
	}

	mux := http.NewServeMux()
	handlePrefixStripped(mux, "api", api.NewHandler(cfg.SecureKeys, uploader, dbDriver, fsDriver))
	handlePrefixStripped(mux, "static", http.FileServerFS(fileaccess.OnlyFiles(baseAssetsRoot.FS())))
	// Uploaded files require authentication
	handlePrefixed(mux, fileaccess.UploadDirectoryName, middleware.VerifyScopes(
		[]string{string(models.Viewer)}, cfg.SecureKeys, dbDriver.Users())(fileServer))
	// Backups require admin access
	handlePrefixed(mux, fileaccess.BackupDirectoryName, middleware.VerifyScopes(
		[]string{string(models.Admin)}, cfg.SecureKeys, dbDriver.Users())(fileServer))
	mux.Handle("/", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, filepath.Join(cfg.BaseAssetsPath, "index.html"))
	}))

	r := middleware.Wrap(
		mux,
		middleware.LogRequests(slog.Default(), cfg.getTrustedProxies()),
		middleware.Recover("Recovered from panic"),
	)

	// subscribe to SIGINT signals
	stopChan := make(chan os.Signal, 1)
	signal.Notify(stopChan, syscall.SIGINT, syscall.SIGTERM)

	timeout := 10 * time.Second
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	slog.Info("Starting server", "port", cfg.Port)
	srv := &http.Server{
		ReadHeaderTimeout: 10 * time.Second,
		Addr:              fmt.Sprintf(":%d", cfg.Port),
		Handler:           r,
	}
	go srv.ListenAndServe()

	// Wait for a stop signal
	<-stopChan
	slog.Info("Shutting down server...")

	// Shutdown the http server
	return srv.Shutdown(ctx)
}

func migrateDatabaseUp(ctx context.Context, _ *cli.Command) error {
	cfg, ok := ConfigFromContext(ctx)
	if !ok {
		return errors.New("failed to retrieve configuration from context")
	}

	dbDriver, err := db.CreateDriver(cfg.Database)
	if err != nil {
		return fmt.Errorf("establishing database driver: %w", err)
	}
	defer dbDriver.Close()

	return dbDriver.MigrateUp()
}

func migrateDatabaseDown(ctx context.Context, _ *cli.Command) error {
	cfg, ok := ConfigFromContext(ctx)
	if !ok {
		return errors.New("failed to retrieve configuration from context")
	}

	dbDriver, err := db.CreateDriver(cfg.Database)
	if err != nil {
		return fmt.Errorf("establishing database driver: %w", err)
	}
	defer dbDriver.Close()

	return dbDriver.MigrateDown()
}

func optimizeImages(ctx context.Context, _ *cli.Command) error {
	cfg, ok := ConfigFromContext(ctx)
	if !ok {
		return errors.New("failed to retrieve configuration from context")
	}

	fsDriver, err := fileaccess.CreateDriver(cfg.FileAccess.Files)
	if err != nil {
		return fmt.Errorf("establishing file access driver: %w", err)
	}

	uploader, err := fileaccess.CreateImageUploader(fsDriver, cfg.FileAccess.Image)
	if err != nil {
		return fmt.Errorf("establishing uploader: %w", err)
	}

	dbDriver, err := db.CreateDriver(cfg.Database)
	if err != nil {
		return fmt.Errorf("establishing database driver: %w", err)
	}
	defer dbDriver.Close()

	images, err := uploader.ListAll()
	if err != nil {
		return fmt.Errorf("listing recipes: %w", err)
	}

	for recipeID, images := range images {
		for _, imageName := range images {
			if err := optimizeImage(ctx, dbDriver, uploader, recipeID, imageName); err != nil {
				return err
			}
		}
	}

	return nil
}

func optimizeImage(ctx context.Context, dbDriver db.Driver, uploader *fileaccess.ImageUploader, recipeID int64, imageName string) error {
	// Load the current original
	data, err := uploader.Load(recipeID, imageName)
	if err != nil {
		return err
	}

	// Resave it, which will downscale if larger than the threshold,
	// as well as regenerate the thumbnail
	res, err := uploader.Save(recipeID, imageName, data)
	if err != nil {
		return fmt.Errorf("failed to re-save image data: %w", err)
	}

	// The name may have changed if the original was not in the current optimized format
	if imageName != res.Name {
		// Delete the original image
		if err := uploader.Delete(recipeID, imageName); err != nil {
			return fmt.Errorf("failed to delete original image file: %w", err)
		}

		recipe, err := dbDriver.Recipes().Read(ctx, recipeID)
		if err != nil {
			return fmt.Errorf("failed to get recipe %d: %w", recipeID, err)
		}
		if recipe.MainImageName == imageName {
			// Update the main image name if it was pointing to the original
			recipe.MainImageName = res.Name
			if err := dbDriver.Recipes().Update(ctx, recipe); err != nil {
				return fmt.Errorf("failed to update recipe %d with new main image name: %w", recipeID, err)
			}
		}
	}

	return nil
}
