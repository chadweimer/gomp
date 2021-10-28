package api

import (
	"net/http"

	"github.com/chadweimer/gomp/models"
)

func (h *apiHandler) getRecipeNotes(resp http.ResponseWriter, req *http.Request) {
	recipeID, err := getResourceIDFromURL(req, recipeIDKey)
	if err != nil {
		h.Error(resp, http.StatusBadRequest, err)
		return
	}

	notes, err := h.db.Notes().List(recipeID)
	if err != nil {
		h.Error(resp, http.StatusInternalServerError, err)
		return
	}

	h.OK(resp, notes)
}

func (h *apiHandler) postNote(resp http.ResponseWriter, req *http.Request) {
	recipeID, err := getResourceIDFromURL(req, recipeIDKey)
	if err != nil {
		h.Error(resp, http.StatusBadRequest, err)
		return
	}

	var note models.Note
	if err := readJSONFromRequest(req, &note); err != nil {
		h.Error(resp, http.StatusBadRequest, err)
		return
	}

	if note.RecipeID != 0 && note.RecipeID != recipeID {
		h.Error(resp, http.StatusBadRequest, errMismatchedID)
		return
	}
	note.RecipeID = recipeID

	if err := h.db.Notes().Create(&note); err != nil {
		h.Error(resp, http.StatusInternalServerError, err)
		return
	}

	h.Created(resp, note)
}

func (h *apiHandler) putNote(resp http.ResponseWriter, req *http.Request) {
	noteID, err := getResourceIDFromURL(req, noteIDKey)
	if err != nil {
		h.Error(resp, http.StatusBadRequest, err)
		return
	}

	recipeID, err := getResourceIDFromURL(req, recipeIDKey)
	if err != nil {
		h.Error(resp, http.StatusBadRequest, err)
		return
	}

	var note models.Note
	if err := readJSONFromRequest(req, &note); err != nil {
		h.Error(resp, http.StatusBadRequest, err)
		return
	}

	if note.ID != 0 && note.ID != noteID {
		h.Error(resp, http.StatusBadRequest, errMismatchedID)
		return
	}
	note.ID = noteID

	if note.RecipeID != 0 && note.RecipeID != recipeID {
		h.Error(resp, http.StatusBadRequest, errMismatchedID)
		return
	}
	note.RecipeID = recipeID

	if err := h.db.Notes().Update(&note); err != nil {
		h.Error(resp, http.StatusInternalServerError, err)
		return
	}

	h.NoContent(resp)
}

func (h *apiHandler) deleteNote(resp http.ResponseWriter, req *http.Request) {
	recipeID, err := getResourceIDFromURL(req, recipeIDKey)
	if err != nil {
		h.Error(resp, http.StatusBadRequest, err)
		return
	}

	noteID, err := getResourceIDFromURL(req, noteIDKey)
	if err != nil {
		h.Error(resp, http.StatusBadRequest, err)
		return
	}

	if err := h.db.Notes().Delete(recipeID, noteID); err != nil {
		h.Error(resp, http.StatusInternalServerError, err)
		return
	}

	h.NoContent(resp)
}
