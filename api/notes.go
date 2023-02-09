package api

import (
	"context"
)

func (h apiHandler) GetNotes(_ context.Context, request GetNotesRequestObject) (GetNotesResponseObject, error) {
	notes, err := h.db.Notes().List(request.RecipeId)
	if err != nil {
		return nil, err
	}

	return GetNotes200JSONResponse(*notes), nil
}

func (h apiHandler) AddNote(ctx context.Context, request AddNoteRequestObject) (AddNoteResponseObject, error) {
	note := request.Body
	if note.RecipeId == nil {
		note.RecipeId = &request.RecipeId
	} else if *note.RecipeId != request.RecipeId {
		h.LogError(ctx, errMismatchedId)
		return AddNote400Response{}, nil
	}

	if err := h.db.Notes().Create(note); err != nil {
		return nil, err
	}

	return AddNote201JSONResponse(*note), nil
}

func (h apiHandler) SaveNote(ctx context.Context, request SaveNoteRequestObject) (SaveNoteResponseObject, error) {
	note := request.Body
	if note.Id == nil {
		note.Id = &request.NoteId
	} else if *note.Id != request.NoteId {
		h.LogError(ctx, errMismatchedId)
		return SaveNote400Response{}, nil
	}

	if note.RecipeId == nil {
		note.RecipeId = &request.RecipeId
	} else if *note.RecipeId != request.RecipeId {
		h.LogError(ctx, errMismatchedId)
		return SaveNote400Response{}, nil
	}

	if err := h.db.Notes().Update(note); err != nil {
		return nil, err
	}

	return SaveNote204Response{}, nil
}

func (h apiHandler) DeleteNote(_ context.Context, request DeleteNoteRequestObject) (DeleteNoteResponseObject, error) {
	if err := h.db.Notes().Delete(request.RecipeId, request.NoteId); err != nil {
		return nil, err
	}

	return DeleteNote204Response{}, nil
}
