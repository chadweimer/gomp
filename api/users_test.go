package api

import (
	"context"
	"errors"
	"fmt"
	"testing"

	"github.com/chadweimer/gomp/db"
	dbmock "github.com/chadweimer/gomp/mocks/db"
	"github.com/chadweimer/gomp/mocks/upload"
	"github.com/chadweimer/gomp/models"
	"github.com/golang/mock/gomock"
)

func Test_GetUser(t *testing.T) {
	type getUserTest struct {
		userId      int64
		username    string
		expectError bool
	}

	// Arrange
	tests := []getUserTest{
		{1, "user1", false},
		{2, "user2", false},
		{3, "", true},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, usersDriver := getMockUsersApi(ctrl)
			expectedUser := &db.UserWithPasswordHash{
				User: models.User{
					Id:       &test.userId,
					Username: test.username,
				},
			}
			if test.expectError {
				usersDriver.EXPECT().Read(gomock.Any()).Return(nil, db.ErrNotFound)
			} else {
				usersDriver.EXPECT().Read(test.userId).Return(expectedUser, nil)
				usersDriver.EXPECT().Read(gomock.Any()).Times(0).Return(nil, db.ErrNotFound)
			}

			// Act
			resp, err := api.GetUser(context.Background(), GetUserRequestObject{UserId: test.userId})

			// Assert
			if (err != nil) != test.expectError {
				t.Errorf("test %v: received error '%v'", test, err)
			} else if err == nil {
				resp, ok := resp.(GetUser200JSONResponse)
				if !ok {
					t.Errorf("test %v: invalid response", test)
				}
				if resp.Id == nil {
					t.Error("expected non-null id")
				} else if *resp.Id != *expectedUser.Id {
					t.Errorf("expected id: %d, actual id: %d", *expectedUser.Id, *resp.Id)
				}
				if resp.Id == nil {
					t.Error("expected non-null username")
				} else if resp.Username != expectedUser.Username {
					t.Errorf("expected id: %s, actual id: %s", expectedUser.Username, resp.Username)
				}
			}
		})
	}
}

func Test_GetCurrentUser(t *testing.T) {
	type getUserTest struct {
		userId      int64
		username    string
		expectError bool
	}

	// Arrange
	tests := []getUserTest{
		{1, "user1", false},
		{2, "user2", false},
		{3, "", true},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, usersDriver := getMockUsersApi(ctrl)
			expectedUser := &db.UserWithPasswordHash{
				User: models.User{
					Id:       &test.userId,
					Username: test.username,
				},
			}
			ctx := context.WithValue(context.Background(), currentUserIdCtxKey, test.userId)
			if test.expectError {
				usersDriver.EXPECT().Read(gomock.Any()).Return(nil, db.ErrNotFound)
			} else {
				usersDriver.EXPECT().Read(test.userId).Return(expectedUser, nil)
				usersDriver.EXPECT().Read(gomock.Any()).Times(0).Return(nil, db.ErrNotFound)
			}

			// Act
			resp, err := api.GetCurrentUser(ctx, GetCurrentUserRequestObject{})

			// Assert
			if (err != nil) != test.expectError {
				t.Errorf("test %v: received error '%v'", test, err)
			} else if err == nil {
				resp, ok := resp.(GetCurrentUser200JSONResponse)
				if !ok {
					t.Errorf("test %v: invalid response", test)
				}
				if resp.Id == nil {
					t.Error("expected non-null id")
				} else if *resp.Id != *expectedUser.Id {
					t.Errorf("expected id: %d, actual id: %d", *expectedUser.Id, *resp.Id)
				}
				if resp.Id == nil {
					t.Error("expected non-null username")
				} else if resp.Username != expectedUser.Username {
					t.Errorf("expected id: %s, actual id: %s", expectedUser.Username, resp.Username)
				}
			}
		})
	}
}

func Test_GetAllUsers(t *testing.T) {
	type getAllUsersTest struct {
		users       []models.User
		expectError bool
	}

	// Arrange
	tests := []getAllUsersTest{
		{
			[]models.User{
				{Username: "user1"},
			},
			false,
		},
		{[]models.User{}, true},
	}
	for i, test := range tests {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			api, usersDriver := getMockUsersApi(ctrl)
			if test.expectError {
				usersDriver.EXPECT().List().Return(&test.users, errors.New("something failed"))
			} else {
				usersDriver.EXPECT().List().Return(&test.users, nil)
			}

			// Act
			resp, err := api.GetAllUsers(context.Background(), GetAllUsersRequestObject{})

			// Assert
			if (err != nil) != test.expectError {
				t.Errorf("test %v: received error '%v'", test, err)
			} else if err == nil {
				typedResp, ok := resp.(GetAllUsers200JSONResponse)
				if !ok {
					t.Errorf("test %v: invalid response", test)
				}
				if len(typedResp) != len(test.users) {
					t.Errorf("test %v: expected length: %d, actual length: %d", test, len(test.users), len(typedResp))
				}
			}
		})
	}
}

func getMockUsersApi(ctrl *gomock.Controller) (apiHandler, *dbmock.MockUserDriver) {
	dbDriver := dbmock.NewMockDriver(ctrl)
	userDriver := dbmock.NewMockUserDriver(ctrl)
	dbDriver.EXPECT().Users().AnyTimes().Return(userDriver)

	api := apiHandler{
		secureKeys: []string{"secure-key"},
		upl:        upload.NewMockDriver(ctrl),
		db:         dbDriver,
	}
	return api, userDriver
}
