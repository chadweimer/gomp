package api

import (
	"net/http"

	"github.com/chadweimer/gomp/generated/api/editor"
	"github.com/chadweimer/gomp/generated/api/viewer"
	"github.com/chadweimer/gomp/generated/models"
)

func (h apiHandler) GetNotes(resp http.ResponseWriter, req *http.Request, recipeIdInPath viewer.RecipeIdInPath) {
	recipeId := int64(recipeIdInPath)

	notes, err := h.db.Notes().List(recipeId)
	if err != nil {
		h.Error(resp, http.StatusInternalServerError, err)
		return
	}

	h.OK(resp, notes)
}

func (h apiHandler) AddNote(resp http.ResponseWriter, req *http.Request, recipeIdInPath editor.RecipeIdInPath) {
	recipeId := int64(recipeIdInPath)

	var note models.Note
	if err := readJSONFromRequest(req, &note); err != nil {
		h.Error(resp, http.StatusBadRequest, err)
		return
	}

	if note.RecipeId == nil {
		note.RecipeId = &recipeId
	} else if *note.RecipeId != recipeId {
		h.Error(resp, http.StatusBadRequest, errMismatchedId)
		return
	}

	if err := h.db.Notes().Create(&note); err != nil {
		h.Error(resp, http.StatusInternalServerError, err)
		return
	}

	h.Created(resp, note)
}

func (h apiHandler) SaveNote(resp http.ResponseWriter, req *http.Request, recipeIdInPath editor.RecipeIdInPath, noteIdInPath editor.NoteIdInPath) {
	recipeId := int64(recipeIdInPath)
	noteId := int64(noteIdInPath)

	var note models.Note
	if err := readJSONFromRequest(req, &note); err != nil {
		h.Error(resp, http.StatusBadRequest, err)
		return
	}

	if note.Id == nil {
		note.Id = &noteId
	} else if *note.Id != noteId {
		h.Error(resp, http.StatusBadRequest, errMismatchedId)
		return
	}

	if note.RecipeId == nil {
		note.RecipeId = &recipeId
	} else if *note.RecipeId != recipeId {
		h.Error(resp, http.StatusBadRequest, errMismatchedId)
		return
	}

	if err := h.db.Notes().Update(&note); err != nil {
		h.Error(resp, http.StatusInternalServerError, err)
		return
	}

	h.NoContent(resp)
}

func (h apiHandler) DeleteNote(resp http.ResponseWriter, req *http.Request, recipeIdInPath editor.RecipeIdInPath, noteIdInPath editor.NoteIdInPath) {
	recipeId := int64(recipeIdInPath)
	noteId := int64(noteIdInPath)

	if err := h.db.Notes().Delete(recipeId, noteId); err != nil {
		h.Error(resp, http.StatusInternalServerError, err)
		return
	}

	h.NoContent(resp)
}
