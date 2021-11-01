package api

import (
	"net/http"

	"github.com/chadweimer/gomp/generated/api/editor"
	"github.com/chadweimer/gomp/generated/api/viewer"
)

func (h apiHandler) GetLinks(resp http.ResponseWriter, req *http.Request, recipeIdInPath viewer.RecipeIdInPath) {
	recipeId := int64(recipeIdInPath)

	recipes, err := h.db.Links().List(recipeId)
	if err != nil {
		h.Error(resp, http.StatusInternalServerError, err)
		return
	}

	h.OK(resp, recipes)
}

func (h apiHandler) AddLink(resp http.ResponseWriter, req *http.Request, recipeIdInPath editor.RecipeIdInPath, destRecipeIdInPath editor.DestRecipeIdInPath) {
	recipeId := int64(recipeIdInPath)
	destRecipeId := int64(destRecipeIdInPath)

	if err := h.db.Links().Create(recipeId, destRecipeId); err != nil {
		h.Error(resp, http.StatusInternalServerError, err)
		return
	}

	h.NoContent(resp)
}

func (h apiHandler) DeleteLink(resp http.ResponseWriter, req *http.Request, recipeIdInPath editor.RecipeIdInPath, destRecipeIdInPath editor.DestRecipeIdInPath) {
	recipeId := int64(recipeIdInPath)
	destRecipeId := int64(destRecipeIdInPath)

	if err := h.db.Links().Delete(recipeId, destRecipeId); err != nil {
		h.Error(resp, http.StatusInternalServerError, err)
		return
	}

	h.NoContent(resp)
}
