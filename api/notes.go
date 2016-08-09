package api

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/chadweimer/gomp/models"
	"github.com/julienschmidt/httprouter"
)

func (r Router) GetRecipeNotes(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	recipeID, err := strconv.ParseInt(p.ByName("recipeID"), 10, 64)
	if err != nil {
		writeErrorToResponse(resp, err)
		return
	}

	notes, err := r.model.Notes.List(recipeID)
	if err != nil {
		writeErrorToResponse(resp, err)
		return
	}

	writeJSONToResponse(resp, notes)
}

func (r Router) PostNote(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	recipeID, err := strconv.ParseInt(p.ByName("recipeID"), 10, 64)
	if err != nil {
		writeErrorToResponse(resp, err)
		return
	}

	var note models.Note
	if err := readJSONFromRequest(req, &note); err != nil {
		resp.WriteHeader(http.StatusBadRequest)
		return
	}

	note.RecipeID = recipeID
	if err := r.model.Notes.Create(&note); err != nil {
		writeErrorToResponse(resp, err)
		return
	}

	resp.Header().Set("Location", fmt.Sprintf("%s/api/v1/recipes/%d/notes/%d", r.cfg.RootURLPath, recipeID, note.ID))
	resp.WriteHeader(http.StatusCreated)
}

func (r Router) DeleteNote(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
	noteID, err := strconv.ParseInt(p.ByName("noteID"), 10, 64)
	if err != nil {
		writeErrorToResponse(resp, err)
		return
	}

	if err := r.model.Notes.Delete(noteID); err != nil {
		writeErrorToResponse(resp, err)
		return
	}

	resp.WriteHeader(http.StatusOK)
}
