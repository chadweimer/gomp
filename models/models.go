package models

import (
	"github.com/chadweimer/gomp/conf"
	"github.com/chadweimer/gomp/upload"
)

// Model encapsulates the model layer of the application, including database access
type Model struct {
	cfg *conf.Config

	Images *RecipeImageModel
}

// New constructs a new Model object
func New(upl upload.Driver) *Model {
	m := new(Model)
	m.Images = &RecipeImageModel{upl: upl}

	return m
}
