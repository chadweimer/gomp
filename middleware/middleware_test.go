package middleware

import (
	"bytes"
	"fmt"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"regexp"
	"strings"
	"testing"
)

func TestRecover(t *testing.T) {
	type args struct {
		msg string
	}
	tests := []struct {
		name string
		args args
	}{
		{
			name: "Recover",
			args: args{
				msg: "Panic occurred",
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Arrange
			sut := Recover(tt.args.msg)
			handler := sut(http.HandlerFunc(func(_ http.ResponseWriter, _ *http.Request) {
				panic("pretend to panic")
			}))
			defer func() {
				if err := recover(); err != nil {
					t.Errorf("unexpected leak of panic: %v", err)
				}
			}()

			// Act
			handler.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest("GET", "/", nil))
		})
	}
}

func TestLogRequests(t *testing.T) {
	type args struct {
		msg string
	}
	tests := []struct {
		name string
		args args
		want *regexp.Regexp
	}{
		{
			name: "Request is logged",
			args: args{
				msg: "Hello, from handler!",
			},
			want: regexp.MustCompile(
				"^time=.* level=DEBUG msg=Rx request-id=\\d+ from=.* method=GET referrer=\"\" url=\\/\\s+" +
					"time=.* level=DEBUG msg=\"Hello, from handler!\" request-id=\\d+ from=.* method=GET referrer=\"\" url=\\/\\s+" +
					"time=.* level=DEBUG msg=Tx request-id=\\d+ from=.* method=GET referrer=\"\" url=\\/ duration=.* bytes-written=20 status=200$",
			),
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Arrange
			buff := bytes.NewBufferString("")
			logger := slog.New(slog.NewTextHandler(buff, &slog.HandlerOptions{
				Level: slog.LevelDebug,
			}))
			sut := LogRequests(logger)
			handler := sut(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				GetLoggerFromRequest(r).Debug(tt.args.msg)
				w.Write([]byte(tt.args.msg))
			}))

			// Act
			handler.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest("GET", "/", nil))
			got := strings.TrimSpace(buff.String())

			// Assert
			if !tt.want.MatchString(got) {
				t.Errorf("expected: %s, actual: %s", tt.want, got)
			}
		})
	}
}

func TestChain(t *testing.T) {
	type args struct {
		middleware []func(http.Handler) http.Handler
		h          http.Handler
	}
	tests := []struct {
		name string
		args args
		want string
	}{
		{
			name: "Middleware called in correct order",
			args: args{
				middleware: []func(http.Handler) http.Handler{
					func(next http.Handler) http.Handler {
						return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
							_, _ = fmt.Fprint(w, "Middleware1")

							next.ServeHTTP(w, r)
						})
					},
					func(next http.Handler) http.Handler {
						return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
							_, _ = fmt.Fprint(w, "Middleware2")

							next.ServeHTTP(w, r)
						})
					},
				},
				h: http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
					_, _ = fmt.Fprint(w, "Handler")
				}),
			},
			want: "Middleware1Middleware2Handler",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Arrange
			w := httptest.NewRecorder()
			sut := Chain(tt.args.middleware, tt.args.h)

			// Act
			sut.ServeHTTP(w, httptest.NewRequest("GET", "/", nil))

			// Assert
			buff := bytes.NewBufferString("")
			if _, err := buff.ReadFrom(w.Result().Body); err != nil {
				t.Error(err)
			}
			got := buff.String()

			if got != tt.want {
				t.Errorf("expected: %v, actual: %v", tt.want, got)
			}
		})
	}
}
