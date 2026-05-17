package api

import (
	"context"
	"errors"

	"github.com/chadweimer/gomp/db"
	"github.com/chadweimer/gomp/infra"
)

func (h apiHandler) GetNotes(ctx context.Context, request GetNotesRequestObject) (GetNotesResponseObject, error) {
	logger := infra.GetLoggerFromContext(ctx)

	notes, err := h.db.Notes().List(ctx, request.RecipeID)
	if err != nil {
		if errors.Is(err, db.ErrNotFound) {
			return GetNotes404Response{}, nil
		}
		logger.ErrorContext(ctx, "Failed to get notes for recipe",
			"error", err,
			"recipe-id", request.RecipeID)
		return nil, err
	}

	return GetNotes200JSONResponse(*notes), nil
}

func (h apiHandler) AddNote(ctx context.Context, request AddNoteRequestObject) (AddNoteResponseObject, error) {
	logger := infra.GetLoggerFromContext(ctx)

	note := request.Body
	if note.RecipeID == nil {
		note.RecipeID = &request.RecipeID
	} else if *note.RecipeID != request.RecipeID {
		logger.ErrorContext(ctx, "Request ID does not match recipe ID",
			"request-id", request.RecipeID,
			"recipe-id", *note.RecipeID)
		return AddNote400Response{}, nil
	}

	if err := h.db.Notes().Create(ctx, note); err != nil {
		if errors.Is(err, db.ErrNotFound) {
			return AddNote404Response{}, nil
		}
		logger.ErrorContext(ctx, "Failed to add note to recipe",
			"error", err,
			"recipe-id", request.RecipeID)
		return nil, err
	}

	return AddNote201JSONResponse(*note), nil
}

func (h apiHandler) SaveNote(ctx context.Context, request SaveNoteRequestObject) (SaveNoteResponseObject, error) {
	logger := infra.GetLoggerFromContext(ctx)

	note := request.Body
	if note.ID == nil {
		note.ID = &request.NoteID
	} else if *note.ID != request.NoteID {
		logger.ErrorContext(ctx, "Request ID does not match note ID",
			"request-id", request.NoteID,
			"note-id", *note.ID)
		return SaveNote400Response{}, nil
	}

	if note.RecipeID == nil {
		note.RecipeID = &request.RecipeID
	} else if *note.RecipeID != request.RecipeID {
		logger.ErrorContext(ctx, "Request ID does not match recipe ID",
			"request-id", request.RecipeID,
			"recipe-id", *note.RecipeID)
		return SaveNote400Response{}, nil
	}

	if err := h.db.Notes().Update(ctx, note); err != nil {
		if errors.Is(err, db.ErrNotFound) {
			return SaveNote404Response{}, nil
		}
		logger.ErrorContext(ctx, "Failed to update note",
			"error", err,
			"recipe-id", request.RecipeID,
			"note-id", request.NoteID)
		return nil, err
	}

	return SaveNote204Response{}, nil
}

func (h apiHandler) DeleteNote(ctx context.Context, request DeleteNoteRequestObject) (DeleteNoteResponseObject, error) {
	logger := infra.GetLoggerFromContext(ctx)

	if err := h.db.Notes().Delete(ctx, request.RecipeID, request.NoteID); err != nil {
		if errors.Is(err, db.ErrNotFound) {
			return DeleteNote404Response{}, nil
		}
		logger.ErrorContext(ctx, "Failed to delete note",
			"error", err,
			"recipe-id", request.RecipeID,
			"note-id", request.NoteID)
		return nil, err
	}

	return DeleteNote204Response{}, nil
}
