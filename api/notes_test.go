package api

import (
	"context"
	"fmt"
	"testing"

	"github.com/chadweimer/gomp/db"
	dbmock "github.com/chadweimer/gomp/mocks/db"
	"github.com/chadweimer/gomp/mocks/upload"
	"github.com/chadweimer/gomp/models"
	"github.com/golang/mock/gomock"
)

func Test_GetNotes(t *testing.T) {
	// Arrange
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	api, notesDriver := getMockNotesApi(ctrl)
	const recipeId int64 = 1
	expectedNotes := []models.Note{
		{Text: "Note 1"},
		{Text: "Note 2"},
	}
	notesDriver.EXPECT().List(recipeId).Return(&expectedNotes, nil)
	notesDriver.EXPECT().List(gomock.Any()).Times(0).Return(&[]models.Note{}, nil)

	// Act
	resp, err := api.GetNotes(context.Background(), GetNotesRequestObject{RecipeId: recipeId})

	// Assert
	if err != nil {
		t.Errorf("received error: %v", err)
	}
	typedResp, ok := resp.(GetNotes200JSONResponse)
	if !ok {
		t.Fatal("invalid response")
	}
	if len(typedResp) != len(expectedNotes) {
		t.Errorf("expected length: %d, actual length: %d", len(expectedNotes), len(typedResp))
	}
}

func Test_GetNotes_NotFound(t *testing.T) {
	// Arrange
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	api, notesDriver := getMockNotesApi(ctrl)
	notesDriver.EXPECT().List(gomock.Any()).Return(nil, db.ErrNotFound)

	// Act
	_, err := api.GetNotes(context.Background(), GetNotesRequestObject{RecipeId: 1})

	// Assert
	if err != db.ErrNotFound {
		t.Error("ErrNotFound was expected")
	}
}

func Test_AddNote(t *testing.T) {
	type addNoteTest struct {
		recipeId    int64
		note        models.Note
		expectError bool
	}

	// Arrange
	tests := []addNoteTest{
		{1, models.Note{Text: "some note"}, false},
		{2, models.Note{Text: "some other note"}, false},
		{3, models.Note{Text: "some error causing note"}, true},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, notesDriver := getMockNotesApi(ctrl)
			if test.expectError {
				notesDriver.EXPECT().Create(gomock.Any()).Return(db.ErrNotFound)
			} else {
				notesDriver.EXPECT().Create(&test.note).Return(nil)
				notesDriver.EXPECT().Create(gomock.Any()).Times(0).Return(db.ErrNotFound)
			}

			// Act
			resp, err := api.AddNote(context.Background(), AddNoteRequestObject{RecipeId: test.recipeId, Body: &test.note})

			// Assert
			if (err != nil) != test.expectError {
				t.Errorf("test %v: received error '%v'", test, err)
			} else if err == nil {
				_, ok := resp.(AddNote201JSONResponse)
				if !ok {
					t.Errorf("test %v: invalid response", test)
				}
			}
		})
	}
}

func Test_AddNote_MismatchedId(t *testing.T) {
	type addNoteTest struct {
		recipeId int64
		note     models.Note
	}

	// Arrange
	tests := []addNoteTest{
		{1, models.Note{RecipeId: new(int64), Text: "some note"}},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, notesDriver := getMockNotesApi(ctrl)
			notesDriver.EXPECT().Create(test.note).Times(0).Return(nil)
			notesDriver.EXPECT().Create(gomock.Any()).Times(0).Return(nil)

			// Act
			_, err := api.AddNote(context.Background(), AddNoteRequestObject{RecipeId: test.recipeId, Body: &test.note})

			// Assert
			if err == nil {
				t.Errorf("test %v: expected error", test)
			} else if err != errMismatchedId {
				t.Errorf("test %v: received error '%v'", test, err)
			}
		})
	}
}

func Test_SaveNote(t *testing.T) {
	type addNoteTest struct {
		recipeId    int64
		noteId      int64
		note        models.Note
		expectError bool
	}

	// Arrange
	tests := []addNoteTest{
		{1, 1, models.Note{Text: "some note"}, false},
		{2, 3, models.Note{Text: "some other note"}, false},
		{3, 7, models.Note{Text: "some error causing note"}, true},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, notesDriver := getMockNotesApi(ctrl)
			if test.expectError {
				notesDriver.EXPECT().Update(gomock.Any()).Return(db.ErrNotFound)
			} else {
				notesDriver.EXPECT().Update(&test.note).Return(nil)
				notesDriver.EXPECT().Update(gomock.Any()).Times(0).Return(db.ErrNotFound)
			}

			// Act
			resp, err := api.SaveNote(context.Background(), SaveNoteRequestObject{RecipeId: test.recipeId, NoteId: test.noteId, Body: &test.note})

			// Assert
			if (err != nil) != test.expectError {
				t.Errorf("test %v: received error '%v'", test, err)
			} else if err == nil {
				_, ok := resp.(SaveNote204Response)
				if !ok {
					t.Errorf("test %v: invalid response", test)
				}
			}
		})
	}
}

func Test_SaveNote_MismatchedId(t *testing.T) {
	type addNoteTest struct {
		recipeId int64
		noteId   int64
		note     models.Note
	}

	// Arrange
	tests := []addNoteTest{
		{1, 1, models.Note{RecipeId: new(int64), Text: "some note"}},
		{1, 1, models.Note{Id: new(int64), Text: "some other note"}},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, notesDriver := getMockNotesApi(ctrl)
			notesDriver.EXPECT().Update(test.note).Times(0).Return(nil)
			notesDriver.EXPECT().Update(gomock.Any()).Times(0).Return(nil)

			// Act
			_, err := api.SaveNote(context.Background(), SaveNoteRequestObject{RecipeId: test.recipeId, NoteId: test.noteId, Body: &test.note})

			// Assert
			if err == nil {
				t.Errorf("test %v: expected error", test)
			} else if err != errMismatchedId {
				t.Errorf("test %v: received error '%v'", test, err)
			}
		})
	}
}

func Test_DeleteNote(t *testing.T) {
	type deleteLinkTest struct {
		recipeId    int64
		noteId      int64
		expectError bool
	}

	// Arrange
	tests := []deleteLinkTest{
		{1, 2, false},
		{4, 7, false},
		{3, 1, false},
		{2, 9, false},
		{8, 2, true},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, notesDriver := getMockNotesApi(ctrl)
			if test.expectError {
				notesDriver.EXPECT().Delete(gomock.Any(), gomock.Any()).Return(db.ErrNotFound)
			} else {
				notesDriver.EXPECT().Delete(test.recipeId, test.noteId).Return(nil)
				notesDriver.EXPECT().Delete(gomock.Any(), gomock.Any()).Times(0).Return(db.ErrNotFound)
			}

			// Act
			resp, err := api.DeleteNote(context.Background(), DeleteNoteRequestObject{RecipeId: test.recipeId, NoteId: test.noteId})

			// Assert
			if (err != nil) != test.expectError {
				t.Errorf("test %v: received error '%v'", test, err)
			} else if err == nil {
				_, ok := resp.(DeleteNote204Response)
				if !ok {
					t.Errorf("test %v: invalid response", test)
				}
			}
		})
	}
}

func getMockNotesApi(ctrl *gomock.Controller) (apiHandler, *dbmock.MockNoteDriver) {
	dbDriver := dbmock.NewMockDriver(ctrl)
	notesDriver := dbmock.NewMockNoteDriver(ctrl)
	dbDriver.EXPECT().Notes().AnyTimes().Return(notesDriver)

	api := apiHandler{
		secureKeys: []string{},
		upl:        upload.NewMockDriver(ctrl),
		db:         dbDriver,
	}
	return api, notesDriver
}
