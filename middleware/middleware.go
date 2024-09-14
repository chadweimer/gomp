package middleware

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"sync/atomic"
	"time"
)

type ctxKey string

const (
	logCtxKey       = ctxKey("request-logger")
	requestIDCtxKey = ctxKey("request-id")
)

var (
	requestIDHeader = http.CanonicalHeaderKey("X-Request-Id")
	lastRequestID   uint64
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

	return
}

// GetLoggerFromContext gets the logger from the supplied context
func GetLoggerFromContext(ctx context.Context) *slog.Logger {
	logger, ok := ctx.Value(logCtxKey).(*slog.Logger)
	if !ok {
		return slog.Default()
	}

	return logger
}

// GetLoggerFromRequest gets the logger from the supplied request
func GetLoggerFromRequest(r *http.Request) *slog.Logger {
	return GetLoggerFromContext(r.Context())
}

// LogRequests returns a middleware that logs all requests and their responses,
// as well as adds a request specific logger than can be retreived with
// GetLoggerFromContext or GetLoggerFromRequest.
func LogRequests(logger *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := r.Context()

			// Attempt to get request id from the headers
			requestID := r.Header.Get(requestIDHeader)
			if requestID == "" {
				// If it wasn't in the header, use an auto-incrementing counter
				nextRequestID := atomic.AddUint64(&lastRequestID, 1)
				requestID = fmt.Sprintf("%d", nextRequestID)
			}
			ctx = context.WithValue(ctx, requestIDCtxKey, requestID)

			requestLogger := logger.
				With("request-id", requestID).
				With("from", r.RemoteAddr).
				With("method", r.Method).
				With("referrer", r.Referer()).
				With("url", r.URL.String())
			ctx = context.WithValue(ctx, logCtxKey, requestLogger)

			requestLogger.Debug("Rx")

			start := time.Now()
			wrapped := wrapWriter(w)
			defer func() {
				requestLogger.
					With("duration", time.Since(start)).
					With("bytes-written", wrapped.BytesWritten).
					With("status", wrapped.Status).
					Debug("Tx")
			}()

			next.ServeHTTP(wrapped, r.WithContext(ctx))
		})
	}
}
