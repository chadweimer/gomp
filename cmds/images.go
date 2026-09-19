package cmds

import (
	"context"
	"errors"
	"fmt"
	"log/slog"

	"github.com/chadweimer/gomp/config"
	"github.com/chadweimer/gomp/db"
	"github.com/chadweimer/gomp/fileaccess"
	"github.com/urfave/cli/v3"
)

func imagesCmd(cfg config.Config) *cli.Command {
	return &cli.Command{
		Name:  "images",
		Usage: "Image related commands",
		Commands: []*cli.Command{
			{
				Name:  "optimize",
				Usage: "Optimize images",
				Description: "Optimizing images will load and re-save all uploaded recipe images using the latest configuration settings, " +
					"including regenerating thumbnails. If this was already run and the settings have not changed, it will have no effect.",
				Action: optimizeImages(cfg),
			},
		},
	}
}

func optimizeImages(cfg config.Config) func(ctx context.Context, _ *cli.Command) error {
	return func(ctx context.Context, _ *cli.Command) error {
		slog.Info("Optimizing images")

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
			slog.Debug("Optimizing images for recipe", "recipeID", recipeID)
			for _, imageName := range images {
				slog.Debug("Optimizing image", "recipeID", recipeID, "imageName", imageName)

				if err := optimizeImage(ctx, dbDriver, uploader, recipeID, imageName); err != nil {
					return err
				}
			}
		}
		slog.Info("Successfully optimized images")

		return nil
	}
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
		if err == nil {
			if recipe.MainImageName == imageName {
				// Update the main image name if it was pointing to the original
				recipe.MainImageName = res.Name
				if err := dbDriver.Recipes().Update(ctx, recipe); err != nil {
					return fmt.Errorf("failed to update recipe %d with new main image name: %w", recipeID, err)
				}
			}
		} else if !errors.Is(err, db.ErrNotFound) {
			return fmt.Errorf("failed to get recipe %d: %w", recipeID, err)
		}
	}

	return nil
}
