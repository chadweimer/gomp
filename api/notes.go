package api

import (
	"context"
)

func (h apiHandler) GetNotes(ctx context.Context, request GetNotesRequestObject) (GetNotesResponseObject, error) {
	notes, err := h.db.Notes().List(ctx, request.RecipeID)
	if err != nil {
		return nil, err
	}

	return GetNotes200JSONResponse(*notes), nil
}

func (h apiHandler) AddNote(ctx context.Context, request AddNoteRequestObject) (AddNoteResponseObject, error) {
	note := request.Body
	if note.RecipeID == nil {
		note.RecipeID = &request.RecipeID
	} else if *note.RecipeID != request.RecipeID {
		return nil, errMismatchedID
	}

	if err := h.db.Notes().Create(ctx, note); err != nil {
		return nil, err
	}

	return AddNote201JSONResponse(*note), nil
}

func (h apiHandler) SaveNote(ctx context.Context, request SaveNoteRequestObject) (SaveNoteResponseObject, error) {
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

	if err := h.db.Notes().Update(ctx, note); err != nil {
		return nil, err
	}

	return SaveNote204Response{}, nil
}

func (h apiHandler) DeleteNote(ctx context.Context, request DeleteNoteRequestObject) (DeleteNoteResponseObject, error) {
	if err := h.db.Notes().Delete(ctx, request.RecipeID, request.NoteID); err != nil {
		return nil, err
	}

	return DeleteNote204Response{}, nil
}
