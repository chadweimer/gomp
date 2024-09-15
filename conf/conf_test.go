package conf

import (
	"os"
	"reflect"
	"testing"

	"github.com/chadweimer/gomp/models"
)

func Test_loadEnv(t *testing.T) {
	type args struct {
		name    string
		envName string
		envVal  string
	}
	tests := []struct {
		name string
		args args
		want int
	}{
		{
			name: "Supports base name",
			args: args{
				name:    "FOO",
				envName: "FOO",
				envVal:  "123",
			},
			want: 123,
		},
		{
			name: "Supports full name",
			args: args{
				name:    "BAR",
				envName: "GOMP_BAR",
				envVal:  "234",
			},
			want: 234,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Arrange
			err := os.Setenv(tt.args.envName, tt.args.envVal)
			if err != nil {
				t.Error(err)
			}
			var got int

			// Act
			loadEnv(tt.args.name, &got)

			// Assert
			if got != tt.want {
				t.Errorf("expected: %v, actual: %v", tt.want, got)
			}
		})
	}
}

func Test_loadEnv_string(t *testing.T) {
	type args struct {
		name   string
		envVal string
	}
	tests := []struct {
		name string
		args args
		want string
	}{
		{
			name: "Supports strings",
			args: args{
				name:   "SOME_STRING",
				envVal: "a string",
			},
			want: "a string",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Arrange
			err := os.Setenv(tt.args.name, tt.args.envVal)
			if err != nil {
				t.Error(err)
			}
			var got string

			// Act
			loadEnv(tt.args.name, &got)

			// Assert
			if got != tt.want {
				t.Errorf("expected: %v, actual: %v", tt.want, got)
			}
		})
	}
}

func Test_loadEnv_string_array(t *testing.T) {
	type args struct {
		name   string
		envVal string
	}
	tests := []struct {
		name string
		args args
		want []string
	}{
		{
			name: "Supports string arrays",
			args: args{
				name:   "SOME_STRING_ARRAY",
				envVal: "first,second,third",
			},
			want: []string{"first", "second", "third"},
		},
		{
			name: "Supports string array of size 1",
			args: args{
				name:   "SOME_SINGLE_STRING_ARRAY",
				envVal: "single",
			},
			want: []string{"single"},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Arrange
			err := os.Setenv(tt.args.name, tt.args.envVal)
			if err != nil {
				t.Error(err)
			}
			var got []string

			// Act
			loadEnv(tt.args.name, &got)

			// Assert
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("expected: %v, actual: %v", tt.want, got)
			}
		})
	}
}

func Test_loadEnv_bool(t *testing.T) {
	type args struct {
		name   string
		envVal string
	}
	tests := []struct {
		name string
		args args
		want bool
	}{
		{
			name: "Supports false",
			args: args{
				name:   "SOME_FALSE",
				envVal: "0",
			},
			want: false,
		},
		{
			name: "Supports true",
			args: args{
				name:   "SOME_TRUE",
				envVal: "1",
			},
			want: true,
		},
		{
			name: "Supports true as anything",
			args: args{
				name:   "SOME_SOMETHING",
				envVal: "something",
			},
			want: true,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Arrange
			err := os.Setenv(tt.args.name, tt.args.envVal)
			if err != nil {
				t.Error(err)
			}
			var got bool

			// Act
			loadEnv(tt.args.name, &got)

			// Assert
			if got != tt.want {
				t.Errorf("expected: %v, actual: %v", tt.want, got)
			}
		})
	}
}

func Test_loadEnv_image_quality(t *testing.T) {
	type args struct {
		name   string
		envVal string
	}
	tests := []struct {
		name string
		args args
		want models.ImageQualityLevel
	}{
		{
			name: "Supports original",
			args: args{
				name:   "IMG_QUAL_ORIG",
				envVal: "original",
			},
			want: models.ImageQualityOriginal,
		},
		{
			name: "Supports high",
			args: args{
				name:   "IMG_QUAL_HIGH",
				envVal: "high",
			},
			want: models.ImageQualityHigh,
		},
		{
			name: "Supports medium",
			args: args{
				name:   "IMG_QUAL_MEDIUM",
				envVal: "medium",
			},
			want: models.ImageQualityMedium,
		},
		{
			name: "Supports low",
			args: args{
				name:   "IMG_QUAL_LOW",
				envVal: "low",
			},
			want: models.ImageQualityLow,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Arrange
			err := os.Setenv(tt.args.name, tt.args.envVal)
			if err != nil {
				t.Error(err)
			}
			var got models.ImageQualityLevel

			// Act
			loadEnv(tt.args.name, &got)

			// Assert
			if got != tt.want {
				t.Errorf("expected: %v, actual: %v", tt.want, got)
			}
		})
	}
}
