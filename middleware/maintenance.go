package middleware

import (
	"net/http"
	"strings"
)

// Maintenance returns a middleware that checks if system maintenance (such as DB restore) is active.
// When active, any requests whose path does not match the exempt prefixes are rejected with
// HTTP 503 Service Unavailable and a Retry-After header.
func Maintenance(isMaintenanceActive func() bool, exemptPrefixes ...string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if isMaintenanceActive != nil && isMaintenanceActive() {
				path := r.URL.Path
				isExempt := false
				for _, prefix := range exemptPrefixes {
					if strings.HasPrefix(path, prefix) || path == prefix {
						isExempt = true
						break
					}
				}

				if !isExempt {
					w.Header().Set("Retry-After", "5")
					http.Error(w, "System maintenance in progress. Please try again shortly.", http.StatusServiceUnavailable)
					return
				}
			}

			next.ServeHTTP(w, r)
		})
	}
}
