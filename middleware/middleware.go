package middleware

import (
	"context"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"strings"
	"sync/atomic"
	"time"

	"github.com/chadweimer/gomp/infra"
	"github.com/samber/lo"
)

const (
	requestIDCtxKey = infra.ContextKey("request-id")
	clientIPCtxKey  = infra.ContextKey("client-ip")
)

var (
	forwardedForHeader = http.CanonicalHeaderKey("X-Forwarded-For")
	requestIDHeader    = http.CanonicalHeaderKey("X-Request-Id")
	lastRequestID      uint64
)

type responseWriter struct {
	http.ResponseWriter
	wroteHeader  bool
	Status       int
	BytesWritten int
}

func wrapWriter(w http.ResponseWriter) *responseWriter {
	return &responseWriter{ResponseWriter: w}
}

func (rw *responseWriter) Write(buf []byte) (int, error) {
	rw.WriteHeader(http.StatusOK)
	n, err := rw.ResponseWriter.Write(buf)
	rw.BytesWritten += n
	return n, err
}

func (rw *responseWriter) WriteHeader(code int) {
	if rw.wroteHeader {
		return
	}

	rw.Status = code
	rw.ResponseWriter.WriteHeader(code)
	rw.wroteHeader = true
}

// Recover provides a middleware that traps and recovers from panics.
func Recover(msg string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		fn := func(w http.ResponseWriter, r *http.Request) {
			defer func() {
				if err := recover(); err != nil {
					infra.GetLoggerFromContext(r.Context()).Error(msg, "error", err)
					http.Error(w, "Internal Server Error", http.StatusInternalServerError)
				}
			}()

			next.ServeHTTP(w, r)
		}

		return http.HandlerFunc(fn)
	}
}

// LogRequests returns a middleware that logs all requests and their responses,
// as well as adds a request specific logger than can be retreived with infra.GetLoggerFromContext.
func LogRequests(logger *slog.Logger, trustedProxies []net.IPNet) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := r.Context()

			requestID := getRequestID(r)
			ctx = context.WithValue(ctx, requestIDCtxKey, requestID)

			clientIP := getClientIP(r, trustedProxies)
			ctx = context.WithValue(ctx, clientIPCtxKey, clientIP)

			requestLogger := logger.With(
				slog.String("request-id", requestID),
				slog.Group("req",
					"from", clientIP,
					"method", r.Method,
					"referrer", r.Referer(),
					"url", r.URL.String()))
			ctx = infra.AddLoggerToContext(ctx, requestLogger)

			requestLogger.Debug("Rx")

			start := time.Now()
			wrapped := wrapWriter(w)
			defer func() {
				requestLogger.Debug("Tx",
					slog.Group("resp",
						"bytes-written", wrapped.BytesWritten,
						"status", wrapped.Status),
					"duration", time.Since(start))
			}()

			next.ServeHTTP(wrapped, r.WithContext(ctx))
		})
	}
}

// Wrap returns a handler that wraps the provided http.Handler with a collection of provided middleware
func Wrap(h http.Handler, middleware ...func(http.Handler) http.Handler) http.Handler {
	for i := len(middleware) - 1; i >= 0; i-- {
		h = middleware[i](h)
	}

	return h
}

func getRequestID(r *http.Request) string {
	// Attempt to get request id from the headers
	requestID := r.Header.Get(requestIDHeader)
	if requestID == "" {
		// If it wasn't in the header, use an auto-incrementing counter
		nextRequestID := atomic.AddUint64(&lastRequestID, 1)
		requestID = fmt.Sprintf("%d", nextRequestID)
	}
	return requestID
}

func getClientIP(r *http.Request, trustedProxies []net.IPNet) string {
	// Get the remote address from the request
	remoteIP := r.RemoteAddr
	if host, _, err := net.SplitHostPort(remoteIP); err == nil {
		remoteIP = host
	}

	if remoteIPAddr := net.ParseIP(remoteIP); remoteIPAddr != nil {
		isTrustedProxy := lo.ContainsBy(trustedProxies, func(proxyNet net.IPNet) bool {
			return proxyNet.Contains(remoteIPAddr)
		})
		if isTrustedProxy {
			// If it's a trusted proxy, check the X-Forwarded-For header for the original client IP
			xForwardedFor := r.Header.Get(forwardedForHeader)
			if xForwardedFor != "" {
				// The X-Forwarded-For header can contain multiple IPs, the first one is the original client IP
				remoteIP, _, _ = strings.Cut(xForwardedFor, ",")
			}
		}
	}

	return remoteIP
}
