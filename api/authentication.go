package api

import (
	"context"
	"errors"
	"net/http"
	"time"

	"github.com/chadweimer/gomp/db"
	"github.com/chadweimer/gomp/infra"
	"github.com/getkin/kin-openapi/openapi3"
	"github.com/getkin/kin-openapi/openapi3filter"
	nethttpmiddleware "github.com/oapi-codegen/nethttp-middleware"
)

func (h apiHandler) Login(ctx context.Context, request LoginRequestObject) (LoginResponseObject, error) {
	credentials := request.Body
	user, err := h.db.Users().Authenticate(ctx, credentials.Username, credentials.Password)
	if err != nil {
		infra.GetLoggerFromContext(ctx).Error("failure authenticating", "error", err)
		return Login401Response{}, nil
	}

	tokenStr, expiresAt, err := infra.CreateToken(*user.ID, infra.GetScopes(user.AccessLevel), h.secureKeys)
	if err != nil {
		return nil, err
	}

	return Login200JSONResponse{
		Body: *user,
		Headers: Login200ResponseHeaders{
			SetCookie: new(infra.CreateAuthCookie(tokenStr, *expiresAt).String()),
		},
	}, nil
}

func (h apiHandler) RefreshToken(ctx context.Context, _ RefreshTokenRequestObject) (RefreshTokenResponseObject, error) {
	return withCurrentUser[RefreshTokenResponseObject](ctx, RefreshToken401Response{}, func(userID int64) (RefreshTokenResponseObject, error) {
		user, err := h.db.Users().Read(ctx, userID)
		if err != nil {
			infra.GetLoggerFromContext(ctx).Error("failure refreshing token", "error", err)
			return RefreshToken401Response{}, nil
		}

		tokenStr, expiresAt, err := infra.CreateToken(*user.ID, infra.GetScopes(user.AccessLevel), h.secureKeys)
		if err != nil {
			return nil, err
		}

		return RefreshToken200JSONResponse{
			Body: user.User,
			Headers: RefreshToken200ResponseHeaders{
				SetCookie: new(infra.CreateAuthCookie(tokenStr, *expiresAt).String()),
			},
		}, nil
	})
}

func (apiHandler) Logout(_ context.Context, _ LogoutRequestObject) (LogoutResponseObject, error) {
	return Logout204Response{
		Headers: Logout204ResponseHeaders{
			SetCookie: new(infra.CreateAuthCookie("", time.Now().Add(-1*time.Hour)).String()),
		},
	}, nil
}

func withCurrentUser[TResponse any](ctx context.Context, invalidUserResponse TResponse, do func(userID int64) (TResponse, error)) (TResponse, error) {
	userID, err := getResourceIDFromCtx(ctx, currentUserIDCtxKey)
	if err != nil {
		infra.GetLoggerFromContext(ctx).Error("failed to get current user from request context", "error", err)
		return invalidUserResponse, nil
	}

	return do(userID)
}

func verifyScopes(spec *openapi3.T, routePrefix string, secureKeys []string, dbDriver db.UserDriver) func(next http.Handler) http.Handler {
	return nethttpmiddleware.OapiRequestValidatorWithOptions(spec, &nethttpmiddleware.Options{
		Prefix:               routePrefix,
		DoNotValidateServers: true,
		Options: openapi3filter.Options{
			// We're not using this for validation
			ExcludeRequestBody:          true,
			ExcludeRequestQueryParams:   true,
			ExcludeResponseBody:         true,
			ExcludeReadOnlyValidations:  true,
			ExcludeWriteOnlyValidations: true,

			AuthenticationFunc: func(ctx context.Context, input *openapi3filter.AuthenticationInput) error {
				// This shouldn't be called without a security scheme, but still double check
				if input.SecurityScheme == nil {
					return nil
				}

				if err := checkScopes(ctx, input.RequestValidationInput.Request, input.Scopes, secureKeys, dbDriver); err != nil {
					return input.NewError(err)
				}

				return nil
			},
		},
	})
}

func checkScopes(ctx context.Context, r *http.Request, requiredScopes, secureKeys []string, dbDriver db.UserDriver) error {
	userID, token, err := infra.IsAuthenticated(ctx, r, secureKeys)
	if err != nil {
		return err
	}

	user, err := dbDriver.Read(ctx, *userID)
	if err != nil {
		if !errors.Is(err, db.ErrNotFound) {
			infra.GetLoggerFromContext(ctx).Error("Error retrieving user info", "error", err)
		}

		return err
	}

	// We know there are scopes because isAuthenticated would have returned an error if there were not
	// revive:disable-next-line:unchecked-type-assertion
	claims := token.Claims.(*infra.GompClaims)
	return infra.CheckScopes(requiredScopes, &user.User, claims)
}
