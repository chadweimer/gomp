package api

import (
	"net/http"

	"github.com/chadweimer/gomp/generated/models"
)

func (h apiHandler) GetNotes(w http.ResponseWriter, r *http.Request, recipeId int64) {
	notes, err := h.db.Notes().List(recipeId)
	if err != nil {
		h.Error(w, r, http.StatusInternalServerError, err)
		return
	}

	h.OK(w, r, notes)
}

func (h apiHandler) AddNote(w http.ResponseWriter, r *http.Request, recipeId int64) {
	var note models.Note
	if err := readJSONFromRequest(r, &note); err != nil {
		h.Error(w, r, http.StatusBadRequest, err)
		return
	}

	if note.RecipeId == nil {
		note.RecipeId = &recipeId
	} else if *note.RecipeId != recipeId {
		h.Error(w, r, http.StatusBadRequest, errMismatchedId)
		return
	}

	if err := h.db.Notes().Create(&note); err != nil {
		h.Error(w, r, http.StatusInternalServerError, err)
		return
	}

	h.Created(w, r, note)
}

func (h apiHandler) SaveNote(w http.ResponseWriter, r *http.Request, recipeId int64, noteId int64) {
	var note models.Note
	if err := readJSONFromRequest(r, &note); err != nil {
		h.Error(w, r, http.StatusBadRequest, err)
		return
	}

	if note.Id == nil {
		note.Id = &noteId
	} else if *note.Id != noteId {
		h.Error(w, r, http.StatusBadRequest, errMismatchedId)
		return
	}

	if note.RecipeId == nil {
		note.RecipeId = &recipeId
	} else if *note.RecipeId != recipeId {
		h.Error(w, r, http.StatusBadRequest, errMismatchedId)
		return
	}

	if err := h.db.Notes().Update(&note); err != nil {
		h.Error(w, r, http.StatusInternalServerError, err)
		return
	}

	h.NoContent(w)
}

func (h apiHandler) DeleteNote(w http.ResponseWriter, r *http.Request, recipeId int64, noteId int64) {
	if err := h.db.Notes().Delete(recipeId, noteId); err != nil {
		h.Error(w, r, http.StatusInternalServerError, err)
		return
	}

	h.NoContent(w)
}
