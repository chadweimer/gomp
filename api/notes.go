package api

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/chadweimer/gomp/models"
	"github.com/julienschmidt/httprouter"
)

func (r Router) getRecipeNotes(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	recipeID, err := strconv.ParseInt(p.ByName("recipeID"), 10, 64)
	if err != nil {
		writeClientErrorToResponse(resp, err)
		return
	}

	notes, err := r.model.Notes.List(recipeID)
	if err != nil {
		writeServerErrorToResponse(resp, err)
		return
	}

	writeJSONToResponse(resp, notes)
}

func (r Router) postNote(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	var note models.Note
	if err := readJSONFromRequest(req, &note); err != nil {
		writeClientErrorToResponse(resp, err)
		return
	}

	if err := r.model.Notes.Create(&note); err != nil {
		writeServerErrorToResponse(resp, err)
		return
	}

	resp.Header().Set("Location", fmt.Sprintf("/api/v1/recipes/%d/notes/%d", note.RecipeID, note.ID))
	resp.WriteHeader(http.StatusCreated)
}

func (r Router) putNote(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	noteID, err := strconv.ParseInt(p.ByName("noteID"), 10, 64)
	if err != nil {
		writeClientErrorToResponse(resp, err)
		return
	}

	var note models.Note
	if err := readJSONFromRequest(req, &note); err != nil {
		writeClientErrorToResponse(resp, err)
		return
	}

	if note.ID != noteID {
		writeClientErrorToResponse(resp, errMismatchedNoteID)
		return
	}

	if err := r.model.Notes.Update(&note); err != nil {
		writeServerErrorToResponse(resp, err)
		return
	}

	resp.WriteHeader(http.StatusNoContent)
}

func (r Router) deleteNote(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	noteID, err := strconv.ParseInt(p.ByName("noteID"), 10, 64)
	if err != nil {
		writeClientErrorToResponse(resp, err)
		return
	}

	if err := r.model.Notes.Delete(noteID); err != nil {
		writeServerErrorToResponse(resp, err)
		return
	}

	resp.WriteHeader(http.StatusOK)
}
