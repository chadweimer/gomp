package api

import (
	"context"
	"fmt"
	"testing"

	"github.com/chadweimer/gomp/db"
	dbmock "github.com/chadweimer/gomp/mocks/db"
	uploadmock "github.com/chadweimer/gomp/mocks/upload"
	"github.com/chadweimer/gomp/models"
	"github.com/chadweimer/gomp/upload"
	"github.com/golang/mock/gomock"
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
				notesDriver.EXPECT().List(test.recipeID).Return(nil, db.ErrNotFound)
			} else {
				notesDriver.EXPECT().List(test.recipeID).Return(&test.notes, nil)
			}

			// Act
			resp, err := api.GetNotes(context.Background(), GetNotesRequestObject{RecipeID: test.recipeID})

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
		{1, models.Note{Text: "some note"}, false},
		{2, models.Note{Text: "some other note"}, false},
		{3, models.Note{Text: "some error causing note"}, true},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, notesDriver := getMockNotesAPI(ctrl)
			if test.expectError {
				notesDriver.EXPECT().Create(gomock.Any()).Return(db.ErrNotFound)
			} else {
				notesDriver.EXPECT().Create(&test.note).Return(nil)
			}

			// Act
			resp, err := api.AddNote(context.Background(), AddNoteRequestObject{RecipeID: test.recipeID, Body: &test.note})

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
		{1, models.Note{RecipeID: new(int64), Text: "some note"}},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, notesDriver := getMockNotesAPI(ctrl)
			notesDriver.EXPECT().Create(test.note).Times(0).Return(nil)

			// Act
			_, err := api.AddNote(context.Background(), AddNoteRequestObject{RecipeID: test.recipeID, Body: &test.note})

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
		{1, 1, models.Note{Text: "some note"}, false},
		{2, 3, models.Note{Text: "some other note"}, false},
		{3, 7, models.Note{Text: "some error causing note"}, true},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, notesDriver := getMockNotesAPI(ctrl)
			if test.expectError {
				notesDriver.EXPECT().Update(gomock.Any()).Return(db.ErrNotFound)
			} else {
				notesDriver.EXPECT().Update(&test.note).Return(nil)
			}

			// Act
			resp, err := api.SaveNote(context.Background(), SaveNoteRequestObject{RecipeID: test.recipeID, NoteID: test.noteID, Body: &test.note})

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
		{1, 1, models.Note{RecipeID: new(int64), Text: "some note"}},
		{1, 1, models.Note{ID: new(int64), Text: "some other note"}},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, notesDriver := getMockNotesAPI(ctrl)
			notesDriver.EXPECT().Update(test.note).Times(0).Return(nil)

			// Act
			_, err := api.SaveNote(context.Background(), SaveNoteRequestObject{RecipeID: test.recipeID, NoteID: test.noteID, Body: &test.note})

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
				notesDriver.EXPECT().Delete(gomock.Any(), gomock.Any()).Return(db.ErrNotFound)
			} else {
				notesDriver.EXPECT().Delete(test.recipeID, test.noteID).Return(nil)
			}

			// Act
			resp, err := api.DeleteNote(context.Background(), DeleteNoteRequestObject{RecipeID: test.recipeID, NoteID: test.noteID})

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
	uplDriver := uploadmock.NewMockDriver(ctrl)
	imgCfg := models.ImageConfiguration{
		ImageQuality:     models.ImageQualityOriginal,
		ImageSize:        2000,
		ThumbnailQuality: models.ImageQualityMedium,
		ThumbnailSize:    500,
	}

	api := apiHandler{
		secureKeys: []string{},
		upl:        upload.CreateImageUploader(uplDriver, imgCfg),
		db:         dbDriver,
	}
	return api, notesDriver
}
