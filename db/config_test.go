package db

import (
	"net/url"
	"testing"
)

func TestConfig_validate(t *testing.T) {
	type fields struct {
		Driver string
		URL    url.URL
	}
	init := func(opts ...func(f *fields)) fields {
		f := fields{
			Driver: "sqlite",
			URL:    url.URL{Scheme: "file", Path: "/path/to/db"},
		}
		for _, opt := range opts {
			opt(&f)
		}
		return f
	}
	tests := []struct {
		name    string
		fields  fields
		wantErr bool
	}{
		{
			name:    "Success Case 1",
			fields:  init(),
			wantErr: false,
		},
		{
			name: "Bad Driver",
			fields: init(func(f *fields) {
				f.Driver = "bogus"
			}),
			wantErr: true,
		},
		{
			name: "Empty URL",
			fields: init(func(f *fields) {
				f.URL = url.URL{}
			}),
			wantErr: true,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c := &Config{
				Driver: tt.fields.Driver,
				URL:    tt.fields.URL,
			}
			if got := c.validate(); tt.wantErr != (got != nil) {
				t.Errorf("ImageConfig.validate() = %v, want error? %v", got, tt.wantErr)
			}
		})
	}
}
