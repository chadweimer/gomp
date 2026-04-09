package middleware

import (
	"bytes"
	"fmt"
	"log/slog"
	"net"
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
		name           string
		args           args
		headers        http.Header
		trustedProxies []net.IPNet
		want           *regexp.Regexp
	}{
		{
			name: "Request is logged",
			args: args{
				msg: "Hello, from handler!",
			},
			want: regexp.MustCompile(
				"^time=.* level=DEBUG msg=Rx request-id=\\d+ req\\.from=192\\.0\\.2\\.1 req\\.method=GET req\\.referrer=\"\" req\\.url=\\/\\s+" +
					"time=.* level=DEBUG msg=\"Hello, from handler!\" request-id=\\d+ req\\.from=192\\.0\\.2\\.1 req\\.method=GET req\\.referrer=\"\" req\\.url=\\/\\s+" +
					"time=.* level=DEBUG msg=Tx request-id=\\d+ req\\.from=192\\.0\\.2\\.1 req\\.method=GET req\\.referrer=\"\" req\\.url=\\/ resp\\.bytes-written=20 resp\\.status=200 duration=.*$",
			),
		},
		{
			name: "Request ID is read from headers",
			args: args{
				msg: "Hello, with request ID!",
			},
			headers: http.Header{
				http.CanonicalHeaderKey("X-Request-Id"): []string{"12345"},
			},
			want: regexp.MustCompile(
				"^time=.* level=DEBUG msg=Rx request-id=12345 req\\.from=192\\.0\\.2\\.1 req\\.method=GET req\\.referrer=\"\" req\\.url=\\/\\s+" +
					"time=.* level=DEBUG msg=\"Hello, with request ID!\" request-id=12345 req\\.from=192\\.0\\.2\\.1 req\\.method=GET req\\.referrer=\"\" req\\.url=\\/\\s+" +
					"time=.* level=DEBUG msg=Tx request-id=12345 req\\.from=192\\.0\\.2\\.1 req\\.method=GET req\\.referrer=\"\" req\\.url=\\/ resp\\.bytes-written=23 resp\\.status=200 duration=.*$",
			),
		},
		{
			name: "ClientIP is read from headers",
			args: args{
				msg: "Hello, with client IP!",
			},
			headers: http.Header{
				http.CanonicalHeaderKey("X-Forwarded-For"): []string{"1.2.3.4,5.6.7.8"},
			},
			trustedProxies: []net.IPNet{
				{
					IP:   net.ParseIP("192.0.0.0"),
					Mask: net.CIDRMask(8, 32),
				},
			},
			want: regexp.MustCompile(
				"^time=.* level=DEBUG msg=Rx request-id=\\d+ req.from=1\\.2\\.3\\.4 req\\.method=GET req\\.referrer=\"\" req\\.url=\\/\\s+" +
					"time=.* level=DEBUG msg=\"Hello, with client IP!\" request-id=\\d+ req\\.from=1\\.2\\.3\\.4 req\\.method=GET req\\.referrer=\"\" req\\.url=\\/\\s+" +
					"time=.* level=DEBUG msg=Tx request-id=\\d+ req\\.from=1\\.2\\.3\\.4 req\\.method=GET req\\.referrer=\"\" req\\.url=\\/ resp\\.bytes-written=22 resp\\.status=200 duration=.*$",
			),
		},
		{
			name: "ClientIP is ignored for untrusted proxy",
			args: args{
				msg: "Hello, with ignored client IP!",
			},
			headers: http.Header{
				http.CanonicalHeaderKey("X-Forwarded-For"): []string{"1.2.3.4,5.6.7.8"},
			},
			want: regexp.MustCompile(
				"^time=.* level=DEBUG msg=Rx request-id=\\d+ req\\.from=192\\.0\\.2\\.1 req\\.method=GET req\\.referrer=\"\" req\\.url=\\/\\s+" +
					"time=.* level=DEBUG msg=\"Hello, with ignored client IP!\" request-id=\\d+ req\\.from=192\\.0\\.2\\.1 req\\.method=GET req\\.referrer=\"\" req\\.url=\\/\\s+" +
					"time=.* level=DEBUG msg=Tx request-id=\\d+ req\\.from=192\\.0\\.2\\.1 req\\.method=GET req\\.referrer=\"\" req\\.url=\\/ resp\\.bytes-written=30 resp\\.status=200 duration=.*$",
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
			sut := LogRequests(logger, tt.trustedProxies)
			handler := sut(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				GetLoggerFromRequest(r).Debug(tt.args.msg)
				w.Write([]byte(tt.args.msg))
			}))
			req := httptest.NewRequest("GET", "/", nil)
			if tt.headers != nil {
				req.Header = tt.headers
			}

			// Act
			handler.ServeHTTP(httptest.NewRecorder(), req)
			got := strings.TrimSpace(buff.String())

			// Assert
			if !tt.want.MatchString(got) {
				t.Errorf("expected: %s, actual: %s", tt.want, got)
			}
		})
	}
}

func TestWrap(t *testing.T) {
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
			sut := Wrap(tt.args.h, tt.args.middleware...)

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
