package api

import (
	"context"
	"errors"
	"net/http"

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

	token, err := h.tokenHandler.Generate(*user.ID, infra.GetScopes(user.AccessLevel), credentials.RememberMe)
	if err != nil {
		return nil, err
	}
	cookie, err := h.tokenHandler.AsCookie(token)
	if err != nil {
		return nil, err
	}

	return Login200JSONResponse{
		Body: *user,
		Headers: Login200ResponseHeaders{
			SetCookie: new(cookie.String()),
		},
	}, nil
}

func (h apiHandler) RefreshToken(ctx context.Context, _ RefreshTokenRequestObject) (RefreshTokenResponseObject, error) {
	logger := infra.GetLoggerFromContext(ctx)

	user := infra.GetUserFromContext(ctx)
	currentToken := infra.GetTokenFromContext(ctx)
	if user == nil || currentToken == nil {
		logger.Error("Missing user or token in context")
		return RefreshToken401Response{}, nil
	}

	newToken, err := h.tokenHandler.Generate(*user.ID, infra.GetScopes(user.AccessLevel), currentToken.TypedClaims.RememberMe)
	if err != nil {
		logger.Error("Error generating new token", "error", err)
		return RefreshToken401Response{}, nil
	}
	cookie, err := h.tokenHandler.AsCookie(newToken)
	if err != nil {
		logger.Error("Error converting token to cookie", "error", err)
		return RefreshToken401Response{}, nil
	}

	return RefreshToken200JSONResponse{
		Body: *user,
		Headers: RefreshToken200ResponseHeaders{
			SetCookie: new(cookie.String()),
		},
	}, nil
}

func (h apiHandler) Logout(_ context.Context, _ LogoutRequestObject) (LogoutResponseObject, error) {
	cookie, err := h.tokenHandler.AsCookie(nil)
	if err != nil {
		return nil, err
	}
	return Logout204Response{
		Headers: Logout204ResponseHeaders{
			SetCookie: new(cookie.String()),
		},
	}, nil
}

func withCurrentUser[TResponse any](ctx context.Context, invalidUserResponse TResponse, do func(userID int64) (TResponse, error)) (TResponse, error) {
	user := infra.GetUserFromContext(ctx)
	if user == nil || user.ID == nil {
		infra.GetLoggerFromContext(ctx).Error("failed to get current user from request context")
		return invalidUserResponse, nil
	}

	return do(*user.ID)
}

func verifyScopes(spec *openapi3.T, routePrefix string) func(next http.Handler) http.Handler {
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

				if err := checkScopes(ctx, input.Scopes); err != nil {
					return input.NewError(err)
				}

				return nil
			},
		},
	})
}

func checkScopes(ctx context.Context, requiredScopes []string) error {
	token := infra.GetTokenFromContext(ctx)
	if token == nil {
		return errors.New("unauthenticated")
	}

	return infra.CheckScopes(requiredScopes, token.TypedClaims)
}
