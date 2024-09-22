package upload

import (
	"testing"
)

func TestDriverConfig_validate(t *testing.T) {
	type fields struct {
		Driver string
		Path   string
	}
	init := func(opts ...func(f *fields)) fields {
		f := fields{
			Driver: "fs",
			Path:   "/path/to/uploads",
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
			name: "Empty Path",
			fields: init(func(f *fields) {
				f.Path = ""
			}),
			wantErr: true,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c := &DriverConfig{
				Driver: tt.fields.Driver,
				Path:   tt.fields.Path,
			}
			if got := c.validate(); tt.wantErr != (got != nil) {
				t.Errorf("DriverConfig.validate() = %v, want error? %v", got, tt.wantErr)
			}
		})
	}
}

func TestImageConfig_validate(t *testing.T) {
	type fields struct {
		ImageQuality     ImageQualityLevel
		ImageSize        int
		ThumbnailQuality ImageQualityLevel
		ThumbnailSize    int
	}
	init := func(opts ...func(f *fields)) fields {
		f := fields{
			ImageQuality:     "original",
			ImageSize:        1,
			ThumbnailQuality: "high",
			ThumbnailSize:    1,
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
			name: "Bad Image Quality",
			fields: init(func(f *fields) {
				f.ImageQuality = "bogus"
			}),
			wantErr: true,
		},
		{
			name: "Bad Thumbnail Quality",
			fields: init(func(f *fields) {
				f.ThumbnailQuality = "bogus"
			}),
			wantErr: true,
		},
		{
			name: "Thumbnail Quality cannot be original",
			fields: init(func(f *fields) {
				f.ThumbnailQuality = "original"
			}),
			wantErr: true,
		},
		{
			name:    "Unset",
			fields:  fields{},
			wantErr: true,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c := &ImageConfig{
				ImageQuality:     tt.fields.ImageQuality,
				ImageSize:        tt.fields.ImageSize,
				ThumbnailQuality: tt.fields.ThumbnailQuality,
				ThumbnailSize:    tt.fields.ThumbnailSize,
			}
			if got := c.validate(); tt.wantErr != (got != nil) {
				t.Errorf("ImageConfig.validate() = %v, want error? %v", got, tt.wantErr)
			}
		})
	}
}
