package conf

import (
	"fmt"
	"math/rand"
	"reflect"
	"testing"

	"github.com/chadweimer/gomp/db"
	"github.com/chadweimer/gomp/models"
	"github.com/chadweimer/gomp/upload"
)

func Test_Load(t *testing.T) {
	type test struct {
		name string
		envs map[string]string
		want *Config
	}
	init := func(name string, opts ...func(val *test)) test {
		val := test{
			name: name,
			envs: map[string]string{},
			want: &Config{
				Port:                   5000,
				UploadDriver:           "fs",
				UploadPath:             "data/uploads",
				IsDevelopment:          false,
				SecureKeys:             []string{"ChangeMe"},
				DatabaseDriver:         db.SQLiteDriverName,
				DatabaseURL:            "file:data/data.db?_pragma=foreign_keys(1)",
				MigrationsTableName:    "",
				MigrationsForceVersion: -1,
				BaseAssetsPath:         "static",
				ImageQuality:           models.ImageQualityOriginal,
				ImageSize:              2000,
				ThumbnailQuality:       models.ImageQualityMedium,
				ThumbnailSize:          500,
			},
		}
		for _, opt := range opts {
			opt(&val)
		}
		return val
	}
	tests := []struct {
		name string
		envs map[string]string
		want *Config
	}{
		init("Defaults"),
		init("Infer SQLite", func(val *test) {
			val.envs["DATABASE_DRIVER"] = ""
			val.want.DatabaseDriver = db.SQLiteDriverName
		}),
		init("Explicit SQLite", func(val *test) {
			val.envs["DATABASE_DRIVER"] = "sqlite"
			val.envs["DATABASE_URL"] = ""
			val.want.DatabaseDriver = db.SQLiteDriverName
			val.want.DatabaseURL = ""
		}),
		init("Explicit SQLite (Legacy)", func(val *test) {
			val.envs["DATABASE_DRIVER"] = "sqlite3"
			val.envs["DATABASE_URL"] = ""
			val.want.DatabaseDriver = db.SQLiteDriverName
			val.want.DatabaseURL = ""
		}),
		init("Infer PostgreSQL", func(val *test) {
			val.envs["DATABASE_DRIVER"] = ""
			val.envs["DATABASE_URL"] = "postgres://user:password@db/name"
			val.want.DatabaseDriver = db.PostgresDriverName
			val.want.DatabaseURL = "postgres://user:password@db/name"
		}),
		init("Explicit PostgreSQL", func(val *test) {
			val.envs["DATABASE_DRIVER"] = "postgres"
			val.envs["DATABASE_URL"] = ""
			val.want.DatabaseDriver = db.PostgresDriverName
			val.want.DatabaseURL = ""
		}),
		init("Unknown Database Driver", func(val *test) {
			val.envs["DATABASE_DRIVER"] = ""
			val.envs["DATABASE_URL"] = "bogus://db"
			val.want.DatabaseDriver = ""
			val.want.DatabaseURL = "bogus://db"
		}),
		init("PORT", func(val *test) {
			val.envs["PORT"] = "32145"
			val.want.Port = 32145
		}),
		init("UPLOAD_DRIVER", func(val *test) {
			val.envs["UPLOAD_DRIVER"] = "s3"
			val.want.UploadDriver = upload.S3Driver
		}),
		init("UPLOAD_PATH", func(val *test) {
			val.envs["UPLOAD_PATH"] = "/upload/path"
			val.want.UploadPath = "/upload/path"
		}),
		init("IS_DEVELOPMENT", func(val *test) {
			val.envs["IS_DEVELOPMENT"] = "1"
			val.want.IsDevelopment = true
		}),
		init("SECURE_KEY", func(val *test) {
			val.envs["SECURE_KEY"] = "key1,key2,key3"
			val.want.SecureKeys = []string{"key1", "key2", "key3"}
		}),
		init("MIGRATIONS_TABLE_NAME", func(val *test) {
			val.envs["MIGRATIONS_TABLE_NAME"] = "sometable"
			val.want.MigrationsTableName = "sometable"
		}),
		init("MIGRATIONS_FORCE_VERSION", func(val *test) {
			val.envs["MIGRATIONS_FORCE_VERSION"] = "123"
			val.want.MigrationsForceVersion = 123
		}),
		init("BASE_ASSETS_PATH", func(val *test) {
			val.envs["BASE_ASSETS_PATH"] = "/base/assets/path"
			val.want.BaseAssetsPath = "/base/assets/path"
		}),
		init("IMAGE_QUALITY", func(val *test) {
			val.envs["IMAGE_QUALITY"] = "low"
			val.want.ImageQuality = models.ImageQualityLow
		}),
		init("IMAGE_SIZE", func(val *test) {
			val.envs["IMAGE_SIZE"] = "42"
			val.want.ImageSize = 42
		}),
		init("THUMBNAIL_QUALITY", func(val *test) {
			val.envs["THUMBNAIL_QUALITY"] = "low"
			val.want.ThumbnailQuality = models.ImageQualityLow
		}),
		init("THUMBNAIL_SIZE", func(val *test) {
			val.envs["THUMBNAIL_SIZE"] = "42"
			val.want.ThumbnailSize = 42
		}),
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			for key, val := range tt.envs {
				t.Setenv(key, val)
			}
			if got := Load(func(_ *Config) { /* Do nothing */ }); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("Load() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestConfig_Validate(t *testing.T) {
	type fields struct {
		Port                   int
		UploadDriver           string
		UploadPath             string
		IsDevelopment          bool
		SecureKeys             []string
		DatabaseDriver         string
		DatabaseURL            string
		MigrationsTableName    string
		MigrationsForceVersion int
		BaseAssetsPath         string
		ImageQuality           models.ImageQualityLevel
		ImageSize              int
		ThumbnailQuality       models.ImageQualityLevel
		ThumbnailSize          int
	}
	init := func(opts ...func(f *fields)) fields {
		f := fields{
			Port:             1,
			UploadDriver:     "fs",
			UploadPath:       "/path/to/uploads",
			SecureKeys:       []string{"secure key"},
			DatabaseDriver:   "sqlite",
			DatabaseURL:      "file:/path/to/db",
			BaseAssetsPath:   "/path/to/assets",
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
		name   string
		fields fields
		want   int
	}{
		{
			name:   "Success Case 1",
			fields: init(),
			want:   0,
		},
		{
			name: "Bad Port",
			fields: init(func(f *fields) {
				f.Port = 0
			}),
			want: 1,
		},
		{
			name: "Bad Upload Driver",
			fields: init(func(f *fields) {
				f.UploadDriver = "bogus"
			}),
			want: 1,
		},
		{
			name: "Nil Secure Keys",
			fields: init(func(f *fields) {
				f.SecureKeys = nil
			}),
			want: 1,
		},
		{
			name: "Default Secure Key",
			fields: init(func(f *fields) {
				f.SecureKeys = []string{"ChangeMe"}
			}),
			want: 0,
		},
		{
			name: "Bad Image Quality",
			fields: init(func(f *fields) {
				f.ImageQuality = "bogus"
			}),
			want: 1,
		},
		{
			name: "Bad Thumbnail Quality",
			fields: init(func(f *fields) {
				f.ThumbnailQuality = "bogus"
			}),
			want: 1,
		},
		{
			name: "Thumbnail Quality cannot be original",
			fields: init(func(f *fields) {
				f.ThumbnailQuality = "original"
			}),
			want: 1,
		},
		{
			name:   "Unset",
			fields: fields{},
			want:   11,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c := &Config{
				Port:                   tt.fields.Port,
				UploadDriver:           tt.fields.UploadDriver,
				UploadPath:             tt.fields.UploadPath,
				IsDevelopment:          tt.fields.IsDevelopment,
				SecureKeys:             tt.fields.SecureKeys,
				DatabaseDriver:         tt.fields.DatabaseDriver,
				DatabaseURL:            tt.fields.DatabaseURL,
				MigrationsTableName:    tt.fields.MigrationsTableName,
				MigrationsForceVersion: tt.fields.MigrationsForceVersion,
				BaseAssetsPath:         tt.fields.BaseAssetsPath,
				ImageQuality:           tt.fields.ImageQuality,
				ImageSize:              tt.fields.ImageSize,
				ThumbnailQuality:       tt.fields.ThumbnailQuality,
				ThumbnailSize:          tt.fields.ThumbnailSize,
			}
			if got := len(c.Validate()); got != tt.want {
				t.Errorf("Config.Validate() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestConfig_ToImageConfiguration(t *testing.T) {
	type fields struct {
		ImageQuality     models.ImageQualityLevel
		ImageSize        int
		ThumbnailQuality models.ImageQualityLevel
		ThumbnailSize    int
	}
	tests := func() []struct {
		name   string
		fields fields
		want   models.ImageConfiguration
	} {
		tests := []struct {
			name   string
			fields fields
			want   models.ImageConfiguration
		}{}

		// Loop over combinations to ensure nothing is hard-coded
		allLevels := []models.ImageQualityLevel{
			models.ImageQualityOriginal,
			models.ImageQualityHigh,
			models.ImageQualityMedium,
			models.ImageQualityLow}
		for _, imageQual := range allLevels {
			for _, thumbQual := range allLevels {
				f := fields{
					ImageQuality:     imageQual,
					ImageSize:        rand.Int(),
					ThumbnailQuality: thumbQual,
					ThumbnailSize:    rand.Int(),
				}
				tests = append(tests, struct {
					name   string
					fields fields
					want   models.ImageConfiguration
				}{
					name:   fmt.Sprintf("%v", f),
					fields: f,
					want: models.ImageConfiguration{
						ImageQuality:     f.ImageQuality,
						ImageSize:        f.ImageSize,
						ThumbnailQuality: f.ThumbnailQuality,
						ThumbnailSize:    f.ThumbnailSize,
					},
				})
			}
		}

		return tests
	}
	for _, tt := range tests() {
		t.Run(tt.name, func(t *testing.T) {
			c := Config{
				ImageQuality:     tt.fields.ImageQuality,
				ImageSize:        tt.fields.ImageSize,
				ThumbnailQuality: tt.fields.ThumbnailQuality,
				ThumbnailSize:    tt.fields.ThumbnailSize,
			}
			if got := c.ToImageConfiguration(); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("Config.ToImageConfiguration() = %v, want %v", got, tt.want)
			}
		})
	}
}

func Test_loadEnv_int(t *testing.T) {
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
				name:    "TESTVAL",
				envName: "TESTVAL",
				envVal:  "123",
			},
			want: 123,
		},
		{
			name: "Supports full name",
			args: args{
				name:    "TESTVAL",
				envName: "GOMP_TESTVAL",
				envVal:  "234",
			},
			want: 234,
		},
		{
			name: "Bad value returns zero",
			args: args{
				name:    "TESTVAL",
				envName: "TESTVAL",
				envVal:  "1a",
			},
			want: 0,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Arrange
			t.Setenv(tt.args.envName, tt.args.envVal)
			var got int

			// Act
			loadEnv(tt.args.name, &got)

			// Assert
			if got != tt.want {
				t.Errorf("%s got = %v, want = %v", tt.name, got, tt.want)
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
				name:   "TESTVAL",
				envVal: "a string",
			},
			want: "a string",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Arrange
			t.Setenv(tt.args.name, tt.args.envVal)
			var got string

			// Act
			loadEnv(tt.args.name, &got)

			// Assert
			if got != tt.want {
				t.Errorf("%s got = %v, want = %v", tt.name, got, tt.want)
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
				name:   "TESTVAL",
				envVal: "first,second,third",
			},
			want: []string{"first", "second", "third"},
		},
		{
			name: "Supports string array of size 1",
			args: args{
				name:   "TESTVAL",
				envVal: "single",
			},
			want: []string{"single"},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Arrange
			t.Setenv(tt.args.name, tt.args.envVal)
			var got []string

			// Act
			loadEnv(tt.args.name, &got)

			// Assert
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("%s got = %v, want = %v", tt.name, got, tt.want)
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
				name:   "TESTVAL",
				envVal: "0",
			},
			want: false,
		},
		{
			name: "Supports true",
			args: args{
				name:   "TESTVAL",
				envVal: "1",
			},
			want: true,
		},
		{
			name: "Supports true as anything",
			args: args{
				name:   "TESTVAL",
				envVal: "something",
			},
			want: true,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Arrange
			t.Setenv(tt.args.name, tt.args.envVal)
			var got bool

			// Act
			loadEnv(tt.args.name, &got)

			// Assert
			if got != tt.want {
				t.Errorf("%s got = %v, want = %v", tt.name, got, tt.want)
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
				name:   "TESTVAL",
				envVal: "original",
			},
			want: models.ImageQualityOriginal,
		},
		{
			name: "Supports high",
			args: args{
				name:   "TESTVAL",
				envVal: "high",
			},
			want: models.ImageQualityHigh,
		},
		{
			name: "Supports medium",
			args: args{
				name:   "TESTVAL",
				envVal: "medium",
			},
			want: models.ImageQualityMedium,
		},
		{
			name: "Supports low",
			args: args{
				name:   "TESTVAL",
				envVal: "low",
			},
			want: models.ImageQualityLow,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Arrange
			t.Setenv(tt.args.name, tt.args.envVal)
			var got models.ImageQualityLevel

			// Act
			loadEnv(tt.args.name, &got)

			// Assert
			if got != tt.want {
				t.Errorf("%s got = %v, want = %v", tt.name, got, tt.want)
			}
		})
	}
}
