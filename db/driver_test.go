package db

import (
	"net/url"
	"testing"
)

func Test_getDbDriverFromURL(t *testing.T) {
	tests := []struct {
		name          string
		connectionURL url.URL
		want          string
		wantErr       bool
	}{
		{
			name:          "infer SQLite from file scheme",
			connectionURL: url.URL{Scheme: "file"},
			want:          SQLiteDriverName,
			wantErr:       false,
		},
		{
			name:          "infer Postgres from postgres scheme",
			connectionURL: url.URL{Scheme: "postgres"},
			want:          PostgresDriverName,
			wantErr:       false,
		},
		{
			name:          "error on unknown scheme",
			connectionURL: url.URL{Scheme: "unknown"},
			want:          "",
			wantErr:       true,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, gotErr := getDbDriverFromURL(tt.connectionURL)
			if gotErr != nil {
				if !tt.wantErr {
					t.Errorf("getDbDriver() failed: %v", gotErr)
				}
				return
			}
			if tt.wantErr {
				t.Fatal("getDbDriver() succeeded unexpectedly")
			}
			if got != tt.want {
				t.Errorf("getDbDriver() = %v, want %v", got, tt.want)
			}
		})
	}
}
