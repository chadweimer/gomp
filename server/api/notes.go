package api

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/chadweimer/gomp/server/models"
	"github.com/julienschmidt/httprouter"
)

func (h apiHandler) getRecipeNotes(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	recipeID, err := strconv.ParseInt(p.ByName("recipeID"), 10, 64)
	if err != nil {
		h.JSON(resp, http.StatusBadRequest, err.Error())
		return
	}

	notes, err := h.model.Notes.List(recipeID)
	if err != nil {
		h.JSON(resp, http.StatusInternalServerError, err.Error())
		return
	}

	h.JSON(resp, http.StatusOK, notes)
}

func (h apiHandler) postNote(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	var note models.Note
	if err := readJSONFromRequest(req, &note); err != nil {
		h.JSON(resp, http.StatusBadRequest, err.Error())
		return
	}

	if err := h.model.Notes.Create(&note); err != nil {
		h.JSON(resp, http.StatusInternalServerError, err.Error())
		return
	}

	resp.Header().Set("Location", fmt.Sprintf("/api/v1/recipes/%d/notes/%d", note.RecipeID, note.ID))
	resp.WriteHeader(http.StatusCreated)
}

func (h apiHandler) putNote(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	noteID, err := strconv.ParseInt(p.ByName("noteID"), 10, 64)
	if err != nil {
		h.JSON(resp, http.StatusBadRequest, err.Error())
		return
	}

	var note models.Note
	if err := readJSONFromRequest(req, &note); err != nil {
		h.JSON(resp, http.StatusBadRequest, err.Error())
		return
	}

	if note.ID != noteID {
		h.JSON(resp, http.StatusBadRequest, errMismatchedNoteID.Error())
		return
	}

	if err := h.model.Notes.Update(&note); err != nil {
		h.JSON(resp, http.StatusInternalServerError, err.Error())
		return
	}

	resp.WriteHeader(http.StatusNoContent)
}

func (h apiHandler) deleteNote(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	noteID, err := strconv.ParseInt(p.ByName("noteID"), 10, 64)
	if err != nil {
		h.JSON(resp, http.StatusBadRequest, err.Error())
		return
	}

	if err := h.model.Notes.Delete(noteID); err != nil {
		h.JSON(resp, http.StatusInternalServerError, err.Error())
		return
	}

	resp.WriteHeader(http.StatusOK)
}
