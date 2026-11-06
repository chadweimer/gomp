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
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			c := &Config{
				Driver: test.fields.Driver,
				URL:    test.fields.URL,
			}
			if got := c.validate(); test.wantErr != (got != nil) {
				t.Errorf("ImageConfig.validate() = %v, want error? %v", got, test.wantErr)
			}
		})
	}
}
