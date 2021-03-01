package api

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/chadweimer/gomp/models"
	"github.com/go-chi/chi"
)

func (h *apiHandler) getRecipeNotes(resp http.ResponseWriter, req *http.Request) {
	recipeIDStr := chi.URLParam(req, recipeIDKey)
	recipeID, err := strconv.ParseInt(recipeIDStr, 10, 64)
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
	var note models.Note
	if err := readJSONFromRequest(req, &note); err != nil {
		h.Error(resp, http.StatusBadRequest, err)
		return
	}

	if err := h.db.Notes().Create(&note); err != nil {
		h.Error(resp, http.StatusInternalServerError, err)
		return
	}

	h.Created(resp, fmt.Sprintf("/api/v1/recipes/%d/notes/%d", note.RecipeID, note.ID))
}

func (h *apiHandler) putNote(resp http.ResponseWriter, req *http.Request) {
	noteIDStr := chi.URLParam(req, noteIDKey)
	noteID, err := strconv.ParseInt(noteIDStr, 10, 64)
	if err != nil {
		h.Error(resp, http.StatusBadRequest, err)
		return
	}

	var note models.Note
	if err := readJSONFromRequest(req, &note); err != nil {
		h.Error(resp, http.StatusBadRequest, err)
		return
	}

	if note.ID != noteID {
		h.Error(resp, http.StatusBadRequest, errMismatchedID)
		return
	}

	if err := h.db.Notes().Update(&note); err != nil {
		h.Error(resp, http.StatusInternalServerError, err)
		return
	}

	h.NoContent(resp)
}

func (h *apiHandler) deleteNote(resp http.ResponseWriter, req *http.Request) {
	noteIDStr := chi.URLParam(req, noteIDKey)
	noteID, err := strconv.ParseInt(noteIDStr, 10, 64)
	if err != nil {
		h.Error(resp, http.StatusBadRequest, err)
		return
	}

	if err := h.db.Notes().Delete(noteID); err != nil {
		h.Error(resp, http.StatusInternalServerError, err)
		return
	}

	h.NoContent(resp)
}
