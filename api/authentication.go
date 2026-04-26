package api

import (
	"context"
	"net/http"

	"github.com/chadweimer/gomp/infra"
	"github.com/chadweimer/gomp/middleware"
)

func (h apiHandler) Login(ctx context.Context, request LoginRequestObject) (LoginResponseObject, error) {
	credentials := request.Body
	user, err := h.db.Users().Authenticate(ctx, credentials.Username, credentials.Password)
	if err != nil {
		infra.GetLoggerFromContext(ctx).Error("failure authenticating", "error", err)
		return Login401Response{}, nil
	}

	tokenStr, err := infra.CreateToken(*user.ID, infra.GetScopes(user.AccessLevel), h.secureKeys)
	if err != nil {
		return nil, err
	}

	return Login200JSONResponse{
		Body: AuthenticationResponse{
			Token: tokenStr,
			User:  *user,
		},
		Headers: Login200ResponseHeaders{
			SetCookie: infra.CreateAuthCookie(tokenStr).String(),
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

		tokenStr, err := infra.CreateToken(*user.ID, infra.GetScopes(user.AccessLevel), h.secureKeys)
		if err != nil {
			return nil, err
		}

		return RefreshToken200JSONResponse{
			Body: AuthenticationResponse{
				Token: tokenStr,
				User:  user.User,
			},
			Headers: RefreshToken200ResponseHeaders{
				SetCookie: infra.CreateAuthCookie(tokenStr).String(),
			},
		}, nil
	})
}

func (apiHandler) Logout(_ context.Context, _ LogoutRequestObject) (LogoutResponseObject, error) {
	return Logout204Response{
		Headers: Logout204ResponseHeaders{
			SetCookie: infra.CreateExpiredAuthCookie().String(),
		},
	}, nil
}

func (h apiHandler) checkScopes(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		routeScopes, ok := r.Context().Value(BearerScopes).([]string)
		if ok {
			next = middleware.VerifyScopes(routeScopes, h.secureKeys, h.db.Users())(next)
		}

		next.ServeHTTP(w, r)
	})
}

func withCurrentUser[TResponse any](ctx context.Context, invalidUserResponse TResponse, do func(userID int64) (TResponse, error)) (TResponse, error) {
	userID, err := getResourceIDFromCtx(ctx, currentUserIDCtxKey)
	if err != nil {
		infra.GetLoggerFromContext(ctx).Error("failed to get current user from request context", "error", err)
		return invalidUserResponse, nil
	}

	return do(userID)
}
