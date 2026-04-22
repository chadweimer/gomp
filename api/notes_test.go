package api

import (
	"fmt"
	"testing"

	"github.com/chadweimer/gomp/db"
	"github.com/chadweimer/gomp/fileaccess"
	dbmock "github.com/chadweimer/gomp/mocks/db"
	fileaccessmock "github.com/chadweimer/gomp/mocks/fileaccess"
	"github.com/chadweimer/gomp/models"
	"go.uber.org/mock/gomock"
)

func Test_GetNotes(t *testing.T) {
	type getNotesTest struct {
		recipeID    int64
		notes       []models.Note
		expectError bool
	}

	tests := []getNotesTest{
		{
			1,
			[]models.Note{
				{Text: "Note 1"},
				{Text: "Note 2"},
			},
			false,
		},
		{2, []models.Note{}, true},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, notesDriver := getMockNotesAPI(ctrl)
			if test.expectError {
				notesDriver.EXPECT().List(t.Context(), test.recipeID).Return(nil, db.ErrNotFound)
			} else {
				notesDriver.EXPECT().List(t.Context(), test.recipeID).Return(&test.notes, nil)
			}

			// Act
			resp, err := api.GetNotes(t.Context(), GetNotesRequestObject{RecipeID: test.recipeID})

			// Assert
			if (err != nil) != test.expectError {
				t.Errorf("received error: %v", err)
			} else if err == nil {
				typedResp, ok := resp.(GetNotes200JSONResponse)
				if !ok {
					t.Error("invalid response")
				}
				if len(typedResp) != len(test.notes) {
					t.Errorf("expected length: %d, actual length: %d", len(test.notes), len(typedResp))
				}
			}
		})
	}
}

func Test_AddNote(t *testing.T) {
	type addNoteTest struct {
		recipeID    int64
		note        models.Note
		expectError bool
	}

	tests := []addNoteTest{
		{1, models.Note{Text: "Add chopped parsley right before serving."}, false},
		{2, models.Note{Text: "Refrigerate leftovers within 2 hours."}, false},
		{3, models.Note{Text: "Intentional failing note fixture"}, true},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, notesDriver := getMockNotesAPI(ctrl)
			if test.expectError {
				notesDriver.EXPECT().Create(t.Context(), gomock.Any()).Return(db.ErrNotFound)
			} else {
				notesDriver.EXPECT().Create(t.Context(), &test.note).Return(nil)
			}

			// Act
			resp, err := api.AddNote(t.Context(), AddNoteRequestObject{RecipeID: test.recipeID, Body: &test.note})

			// Assert
			if (err != nil) != test.expectError {
				t.Errorf("received error: %v", err)
			} else if err == nil {
				_, ok := resp.(AddNote201JSONResponse)
				if !ok {
					t.Error("invalid response")
				}
			}
		})
	}
}

func Test_AddNote_MismatchedID(t *testing.T) {
	type addNoteTest struct {
		recipeID int64
		note     models.Note
	}

	tests := []addNoteTest{
		{1, models.Note{RecipeID: new(int64), Text: "Add chopped parsley right before serving."}},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, notesDriver := getMockNotesAPI(ctrl)
			notesDriver.EXPECT().Create(t.Context(), test.note).Times(0).Return(nil)

			// Act
			_, err := api.AddNote(t.Context(), AddNoteRequestObject{RecipeID: test.recipeID, Body: &test.note})

			// Assert
			if err == nil {
				t.Error("expected error")
			} else if err != errMismatchedID {
				t.Errorf("expected error: %v, received error: %v", errMismatchedID, err)
			}
		})
	}
}

func Test_SaveNote(t *testing.T) {
	type addNoteTest struct {
		recipeID    int64
		noteID      int64
		note        models.Note
		expectError bool
	}

	tests := []addNoteTest{
		{1, 1, models.Note{Text: "Add chopped parsley right before serving."}, false},
		{2, 3, models.Note{Text: "Refrigerate leftovers within 2 hours."}, false},
		{3, 7, models.Note{Text: "Intentional failing note fixture"}, true},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, notesDriver := getMockNotesAPI(ctrl)
			if test.expectError {
				notesDriver.EXPECT().Update(t.Context(), gomock.Any()).Return(db.ErrNotFound)
			} else {
				notesDriver.EXPECT().Update(t.Context(), &test.note).Return(nil)
			}

			// Act
			resp, err := api.SaveNote(t.Context(), SaveNoteRequestObject{RecipeID: test.recipeID, NoteID: test.noteID, Body: &test.note})

			// Assert
			if (err != nil) != test.expectError {
				t.Errorf("received error: %v", err)
			} else if err == nil {
				_, ok := resp.(SaveNote204Response)
				if !ok {
					t.Error("invalid response")
				}
			}
		})
	}
}

func Test_SaveNote_MismatchedID(t *testing.T) {
	type addNoteTest struct {
		recipeID int64
		noteID   int64
		note     models.Note
	}

	tests := []addNoteTest{
		{1, 1, models.Note{RecipeID: new(int64), Text: "Add chopped parsley right before serving."}},
		{1, 1, models.Note{ID: new(int64), Text: "Refrigerate leftovers within 2 hours."}},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, notesDriver := getMockNotesAPI(ctrl)
			notesDriver.EXPECT().Update(t.Context(), test.note).Times(0).Return(nil)

			// Act
			_, err := api.SaveNote(t.Context(), SaveNoteRequestObject{RecipeID: test.recipeID, NoteID: test.noteID, Body: &test.note})

			// Assert
			if err == nil {
				t.Error("expected error")
			} else if err != errMismatchedID {
				t.Errorf("expected error: %v, received error: %v", errMismatchedID, err)
			}
		})
	}
}

func Test_DeleteNote(t *testing.T) {
	type deleteLinkTest struct {
		recipeID    int64
		noteID      int64
		expectError bool
	}

	tests := []deleteLinkTest{
		{1, 2, false},
		{4, 7, false},
		{3, 1, false},
		{2, 9, false},
		{8, 2, true},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, notesDriver := getMockNotesAPI(ctrl)
			if test.expectError {
				notesDriver.EXPECT().Delete(t.Context(), gomock.Any(), gomock.Any()).Return(db.ErrNotFound)
			} else {
				notesDriver.EXPECT().Delete(t.Context(), test.recipeID, test.noteID).Return(nil)
			}

			// Act
			resp, err := api.DeleteNote(t.Context(), DeleteNoteRequestObject{RecipeID: test.recipeID, NoteID: test.noteID})

			// Assert
			if (err != nil) != test.expectError {
				t.Errorf("received error: %v", err)
			} else if err == nil {
				_, ok := resp.(DeleteNote204Response)
				if !ok {
					t.Error("invalid response")
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
		ImageQuality:     fileaccess.ImageQualityOriginal,
		ImageSize:        2000,
		ThumbnailQuality: fileaccess.ImageQualityMedium,
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
