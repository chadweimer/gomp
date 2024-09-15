package api

import (
	"context"
)

func (h apiHandler) GetNotes(_ context.Context, request GetNotesRequestObject) (GetNotesResponseObject, error) {
	notes, err := h.db.Notes().List(request.RecipeID)
	if err != nil {
		return nil, err
	}

	return GetNotes200JSONResponse(*notes), nil
}

func (h apiHandler) AddNote(_ context.Context, request AddNoteRequestObject) (AddNoteResponseObject, error) {
	note := request.Body
	if note.RecipeID == nil {
		note.RecipeID = &request.RecipeID
	} else if *note.RecipeID != request.RecipeID {
		return nil, errMismatchedID
	}

	if err := h.db.Notes().Create(note); err != nil {
		return nil, err
	}

	return AddNote201JSONResponse(*note), nil
}

func (h apiHandler) SaveNote(_ context.Context, request SaveNoteRequestObject) (SaveNoteResponseObject, error) {
	note := request.Body
	if note.ID == nil {
		note.ID = &request.NoteID
	} else if *note.ID != request.NoteID {
		return nil, errMismatchedID
	}

	if note.RecipeID == nil {
		note.RecipeID = &request.RecipeID
	} else if *note.RecipeID != request.RecipeID {
		return nil, errMismatchedID
	}

	if err := h.db.Notes().Update(note); err != nil {
		return nil, err
	}

	return SaveNote204Response{}, nil
}

func (h apiHandler) DeleteNote(_ context.Context, request DeleteNoteRequestObject) (DeleteNoteResponseObject, error) {
	if err := h.db.Notes().Delete(request.RecipeID, request.NoteID); err != nil {
		return nil, err
	}

	return DeleteNote204Response{}, nil
}
