package api

import (
	"database/sql"
	"errors"
	"fmt"
	"testing"

	"github.com/chadweimer/gomp/db"
	"github.com/chadweimer/gomp/fileaccess"
	dbmock "github.com/chadweimer/gomp/mocks/db"
	fileaccessmock "github.com/chadweimer/gomp/mocks/fileaccess"
	"github.com/chadweimer/gomp/models"
	"github.com/chadweimer/gomp/utils"
	"github.com/samber/lo"
	"go.uber.org/mock/gomock"
)

func Test_GetNotes(t *testing.T) {
	type getNotesTest struct {
		name             string
		recipeID         int64
		notes            []models.Note
		dbError          error
		expectedError    error
		expectedResponse GetNotesResponseObject
	}

	tests := []getNotesTest{
		{
			name:     "Notes found",
			recipeID: 1,
			notes: []models.Note{
				{Text: "Note 1"},
				{Text: "Note 2"},
			},
			dbError:       nil,
			expectedError: nil,
			expectedResponse: GetNotes200JSONResponse{
				{Text: "Note 1"},
				{Text: "Note 2"},
			},
		},
		{
			name:             "Recipe not found",
			recipeID:         2,
			notes:            []models.Note{},
			dbError:          db.ErrNotFound,
			expectedError:    nil,
			expectedResponse: GetNotes404Response{},
		},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, notesDriver := getMockNotesAPI(ctrl)
			if test.dbError != nil {
				notesDriver.EXPECT().List(t.Context(), test.recipeID).Return(nil, test.dbError)
			} else {
				notesDriver.EXPECT().List(t.Context(), test.recipeID).Return(&test.notes, nil)
			}

			// Act
			resp, err := api.GetNotes(t.Context(), GetNotesRequestObject{RecipeID: test.recipeID})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", test.expectedError, err)
			} else if err == nil {
				switch expected := test.expectedResponse.(type) {
				case GetNotes200JSONResponse:
					resp, ok := resp.(GetNotes200JSONResponse)
					if !ok {
						t.Errorf("expected GetNotes200JSONResponse, got %T", resp)
					}
					if len(resp) != len(expected) {
						t.Errorf("expected length: %d, actual length: %d", len(expected), len(resp))
					}
					missingNotes, unexpectedNotes := lo.Difference(resp, expected)
					if len(missingNotes) > 0 {
						t.Errorf("missing notes: %v", missingNotes)
					}
					if len(unexpectedNotes) > 0 {
						t.Errorf("unexpected notes: %v", unexpectedNotes)
					}
				case GetNotes404Response:
					_, ok := resp.(GetNotes404Response)
					if !ok {
						t.Errorf("expected GetNotes404Response, got %T", resp)
					}
				default:
					t.Errorf("unexpected response type: %T", resp)
				}
			}
		})
	}
}

func Test_AddNote(t *testing.T) {
	type addNoteTest struct {
		name             string
		recipeID         int64
		note             models.Note
		expectCreate     bool
		dbError          error
		expectedError    error
		expectedResponse AddNoteResponseObject
	}

	tests := []addNoteTest{
		{
			name:             "Valid note with matching recipe ID",
			recipeID:         1,
			note:             models.Note{RecipeID: utils.GetPtr[int64](1), Text: "Add chopped parsley right before serving."},
			expectCreate:     true,
			dbError:          nil,
			expectedError:    nil,
			expectedResponse: AddNote201JSONResponse{RecipeID: utils.GetPtr[int64](1), Text: "Add chopped parsley right before serving."},
		},
		{
			name:             "Valid note without recipe ID",
			recipeID:         2,
			note:             models.Note{Text: "Refrigerate leftovers within 2 hours."},
			expectCreate:     true,
			dbError:          nil,
			expectedError:    nil,
			expectedResponse: AddNote201JSONResponse{RecipeID: utils.GetPtr[int64](2), Text: "Refrigerate leftovers within 2 hours."},
		},
		{
			name:             "Mismatched recipe ID",
			recipeID:         3,
			note:             models.Note{RecipeID: utils.GetPtr[int64](4), Text: "Mismatched recipe ID note fixture."},
			expectCreate:     false,
			dbError:          nil,
			expectedError:    nil,
			expectedResponse: AddNote400Response{},
		},
		{
			name:             "Recipe not found",
			recipeID:         4,
			note:             models.Note{Text: "Recipe not found note fixture."},
			expectCreate:     true,
			dbError:          db.ErrNotFound,
			expectedError:    nil,
			expectedResponse: AddNote404Response{},
		},
		{
			name:             "Database error",
			recipeID:         4,
			note:             models.Note{Text: "Intentional failing note fixture."},
			expectCreate:     true,
			dbError:          sql.ErrConnDone,
			expectedError:    sql.ErrConnDone,
			expectedResponse: nil,
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, notesDriver := getMockNotesAPI(ctrl)
			if test.expectCreate {
				if test.dbError != nil {
					notesDriver.EXPECT().Create(t.Context(), gomock.Any()).Return(test.dbError)
				} else {
					notesDriver.EXPECT().Create(t.Context(), &test.note).Return(nil)
				}
			}

			// Act
			resp, err := api.AddNote(t.Context(), AddNoteRequestObject{RecipeID: test.recipeID, Body: &test.note})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", test.expectedError, err)
			} else if err == nil {
				switch expected := test.expectedResponse.(type) {
				case AddNote201JSONResponse:
					resp, ok := resp.(AddNote201JSONResponse)
					if !ok {
						t.Errorf("expected AddNote201JSONResponse, got %T", resp)
					}
					if resp.Text != expected.Text {
						t.Errorf("expected text: %s, actual text: %s", expected.Text, resp.Text)
					}
					if (resp.RecipeID == nil) != (expected.RecipeID == nil) || (resp.RecipeID != nil && *resp.RecipeID != *expected.RecipeID) {
						t.Errorf("expected recipe ID: %v, actual recipe ID: %v", expected.RecipeID, resp.RecipeID)
					}
				case AddNote400Response:
					_, ok := resp.(AddNote400Response)
					if !ok {
						t.Errorf("expected AddNote400Response, got %T", resp)
					}
				case AddNote404Response:
					_, ok := resp.(AddNote404Response)
					if !ok {
						t.Errorf("expected AddNote404Response, got %T", resp)
					}
				default:
					t.Errorf("unexpected response type: %T", resp)
				}
			}
		})
	}
}

func Test_SaveNote(t *testing.T) {
	type addNoteTest struct {
		name             string
		recipeID         int64
		noteID           int64
		note             models.Note
		expectUpdate     bool
		dbError          error
		expectedError    error
		expectedResponse SaveNoteResponseObject
	}

	tests := []addNoteTest{
		{
			name:             "Valid note update",
			recipeID:         1,
			noteID:           2,
			note:             models.Note{ID: utils.GetPtr[int64](2), RecipeID: utils.GetPtr[int64](1), Text: "Updated note text."},
			expectUpdate:     true,
			dbError:          nil,
			expectedError:    nil,
			expectedResponse: SaveNote204Response{},
		},
		{
			name:             "Recipe or note not found",
			recipeID:         1,
			noteID:           2,
			note:             models.Note{ID: utils.GetPtr[int64](2), RecipeID: utils.GetPtr[int64](1), Text: "Note fixture for not found case."},
			expectUpdate:     true,
			dbError:          db.ErrNotFound,
			expectedError:    nil,
			expectedResponse: SaveNote404Response{},
		},
		{
			name:             "Mismatched note ID",
			recipeID:         1,
			noteID:           2,
			note:             models.Note{ID: utils.GetPtr[int64](3), RecipeID: utils.GetPtr[int64](1), Text: "Mismatched note ID fixture."},
			expectUpdate:     false,
			dbError:          nil,
			expectedError:    nil,
			expectedResponse: SaveNote400Response{},
		},
		{
			name:             "Mismatched recipe ID",
			recipeID:         1,
			noteID:           2,
			note:             models.Note{ID: utils.GetPtr[int64](2), RecipeID: utils.GetPtr[int64](3), Text: "Mismatched recipe ID fixture."},
			expectUpdate:     false,
			dbError:          nil,
			expectedError:    nil,
			expectedResponse: SaveNote400Response{},
		},
		{
			name:             "Database error",
			recipeID:         1,
			noteID:           2,
			note:             models.Note{ID: utils.GetPtr[int64](2), RecipeID: utils.GetPtr[int64](1), Text: "Intentional failing note fixture."},
			expectUpdate:     true,
			dbError:          sql.ErrConnDone,
			expectedError:    sql.ErrConnDone,
			expectedResponse: nil,
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, notesDriver := getMockNotesAPI(ctrl)
			if test.expectUpdate {
				if test.dbError != nil {
					notesDriver.EXPECT().Update(t.Context(), gomock.Any()).Return(test.dbError)
				} else {
					notesDriver.EXPECT().Update(t.Context(), &test.note).Return(nil)
				}
			}

			// Act
			resp, err := api.SaveNote(t.Context(), SaveNoteRequestObject{RecipeID: test.recipeID, NoteID: test.noteID, Body: &test.note})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", test.expectedError, err)
			} else if err == nil {
				switch test.expectedResponse.(type) {
				case SaveNote204Response:
					_, ok := resp.(SaveNote204Response)
					if !ok {
						t.Errorf("expected SaveNote204Response, got %T", resp)
					}
				case SaveNote400Response:
					_, ok := resp.(SaveNote400Response)
					if !ok {
						t.Errorf("expected SaveNote400Response, got %T", resp)
					}
				case SaveNote404Response:
					_, ok := resp.(SaveNote404Response)
					if !ok {
						t.Errorf("expected SaveNote404Response, got %T", resp)
					}
				default:
					t.Errorf("unexpected response type: %T", resp)
				}
			}
		})
	}
}

func Test_DeleteNote(t *testing.T) {
	type deleteLinkTest struct {
		name             string
		recipeID         int64
		noteID           int64
		dbError          error
		expectedError    error
		expectedResponse DeleteNoteResponseObject
	}

	tests := []deleteLinkTest{
		{
			name:             "Valid note deletion",
			recipeID:         1,
			noteID:           2,
			dbError:          nil,
			expectedError:    nil,
			expectedResponse: DeleteNote204Response{},
		},
		{
			name:             "Note not found",
			recipeID:         1,
			noteID:           2,
			dbError:          db.ErrNotFound,
			expectedError:    nil,
			expectedResponse: DeleteNote404Response{},
		},
		{
			name:             "Database error",
			recipeID:         1,
			noteID:           2,
			dbError:          sql.ErrConnDone,
			expectedError:    sql.ErrConnDone,
			expectedResponse: nil,
		},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, notesDriver := getMockNotesAPI(ctrl)
			if test.dbError != nil {
				notesDriver.EXPECT().Delete(t.Context(), gomock.Any(), gomock.Any()).Return(test.dbError)
			} else {
				notesDriver.EXPECT().Delete(t.Context(), test.recipeID, test.noteID).Return(nil)
			}

			// Act
			resp, err := api.DeleteNote(t.Context(), DeleteNoteRequestObject{RecipeID: test.recipeID, NoteID: test.noteID})

			// Assert
			if !errors.Is(err, test.expectedError) {
				t.Errorf("expected error: %v, received error: %v", test.expectedError, err)
			} else if err == nil {
				switch test.expectedResponse.(type) {
				case DeleteNote204Response:
					_, ok := resp.(DeleteNote204Response)
					if !ok {
						t.Errorf("expected DeleteNote204Response, got %T", resp)
					}
				case DeleteNote404Response:
					_, ok := resp.(DeleteNote404Response)
					if !ok {
						t.Errorf("expected DeleteNote404Response, got %T", resp)
					}
				default:
					t.Errorf("unexpected response type: %T", resp)
				}
			}
		})
	}
}

func getMockNotesAPI(ctrl *gomock.Controller) (apiHandler, *dbmock.MockNoteDriver) {
	dbDriver := dbmock.NewMockDriver(ctrl)
	notesDriver := dbmock.NewMockNoteDriver(ctrl)
	dbDriver.EXPECT().Notes().AnyTimes().Return(notesDriver)
	uplDriver := fileaccessmock.NewMockDriver(ctrl)
	imgCfg := fileaccess.ImageConfig{
		ImageQuality:     models.ImageQualityOriginal,
		ImageSize:        2000,
		ThumbnailQuality: models.ImageQualityMedium,
		ThumbnailSize:    500,
	}
	upl, _ := fileaccess.CreateImageUploader(uplDriver, imgCfg)

	api := apiHandler{
		secureKeys: []string{},
		upl:        upl,
		db:         dbDriver,
	}
	return api, notesDriver
}
