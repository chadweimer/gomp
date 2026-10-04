package cmds

import (
	"context"
	"os"

	"github.com/chadweimer/gomp/config"
	docs "github.com/urfave/cli-docs/v3"
	"github.com/urfave/cli/v3"
)

func docsCmd(cfg config.Config) *cli.Command {
	return &cli.Command{
		Name:   "docs",
		Usage:  "Documentation related commands",
		Hidden: true,
		Commands: []*cli.Command{
			{
				Name:  "generate",
				Usage: "Generate documentation",
				Flags: []cli.Flag{
					&cli.StringFlag{
						Name:      "output",
						Aliases:   []string{"o"},
						Usage:     "Path to output Markdown file (required)",
						TakesFile: true,
						Required:  true,
					},
					&cli.BoolFlag{
						Name:  "tagged",
						Usage: "Whether to generate the documentation between tagged sections or overwrite the entire file",
					},
				},
				Action: generateDocs(cfg),
			},
		},
	}
}

func generateDocs(cfg config.Config) func(context.Context, *cli.Command) error {
	return func(_ context.Context, cli *cli.Command) error {
		path := cli.String("output")
		tagged := cli.Bool("tagged")

		if tagged {
			return docs.ToTabularToFileBetweenTags(RootCmd(cfg), "./gomp", path)
		} else {
			md, err := docs.ToTabularMarkdown(RootCmd(cfg), "./gomp")
			if err != nil {
				return err
			}
			err = os.WriteFile(path, []byte(md), 0644)
			if err != nil {
				return err
			}
		}
		// Implement the logic for generating documentation using the path and tagged variables
		return nil
	}
}
