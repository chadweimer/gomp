package main

import "testing"

func TestConfig_validate(t *testing.T) {
	type fields struct {
		Port           int
		BaseAssetsPath string
		SecureKeys     []string
	}
	init := func(opts ...func(f *fields)) fields {
		f := fields{
			Port:           1234,
			BaseAssetsPath: "/path/to/assets",
			SecureKeys:     []string{"secure key"},
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
			name: "Bad Port",
			fields: init(func(f *fields) {
				f.Port = -1
			}),
			wantErr: true,
		},
		{
			name: "Empty Assets Path",
			fields: init(func(f *fields) {
				f.BaseAssetsPath = ""
			}),
			wantErr: true,
		},
		{
			name: "Empty Secure Key",
			fields: init(func(f *fields) {
				f.SecureKeys = []string{}
			}),
			wantErr: true,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c := &Config{
				Port:           tt.fields.Port,
				BaseAssetsPath: tt.fields.BaseAssetsPath,
				SecureKeys:     tt.fields.SecureKeys,
			}
			if got := c.validate(); tt.wantErr != (got != nil) {
				t.Errorf("Config.validate() = %v, want error? %v", got, tt.wantErr)
			}
		})
	}
}
