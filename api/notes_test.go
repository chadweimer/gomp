package api

import (
	"context"
	"testing"

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
