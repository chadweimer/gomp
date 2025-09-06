package conf

import (
	"errors"
	"net/url"
	"reflect"
	"strconv"
	"testing"
	"time"

	"github.com/chadweimer/gomp/utils"
)

func TestBind_Defaults(t *testing.T) {
	type intTypes struct {
		TestInt      int   `default:"-1"`
		TestInt8     int8  `default:"-0b10"`
		TestInt16    int16 `default:"-0o3"`
		TestInt32    int32 `default:"-0x4"`
		TestInt64    int64 `default:"-5"`
		TestIntArray []int `default:"-1,-2"`
		TestIntPtr   *int  `default:"-1"`
	}
	type allSupportedTypes struct {
		unexportedInt int `default:"5"`

		TestInts intTypes

		TestUint      uint   `default:"1"`
		TestUint8     uint8  `default:"0b10"`
		TestUint16    uint16 `default:"0o3"`
		TestUint32    uint32 `default:"0x4"`
		TestUint64    uint64 `default:"5"`
		TestUintArray []uint `default:"1,2"`

		TestFloat32      float32   `default:"1.1"`
		TestFloat64      float64   `default:"2.2"`
		TestFloat64Array []float64 `default:"1.1, 2.2"` // Space after comma is intentional

		TestComplex64  complex64  `default:"1i"`
		TestComplex128 complex128 `default:"2i"`

		TestBool      bool   `default:"true"`
		TestBoolArray []bool `default:"true,false"`

		TestString string `default:"Hello, Tests!"`

		TestTime time.Time `default:"2000-01-02T03:04:05Z"`

		TestURL url.URL `default:"https://example.com"`
	}
	tests := []struct {
		name string
		want allSupportedTypes
	}{
		{
			name: "Defaults are set",
			want: allSupportedTypes{
				unexportedInt: 0, // Should be ignored, not set

				TestInts: intTypes{
					TestInt:      -1,
					TestInt8:     -2,
					TestInt16:    -3,
					TestInt32:    -4,
					TestInt64:    -5,
					TestIntArray: []int{-1, -2},
					TestIntPtr:   utils.GetPtr(-1),
				},

				TestUint:      1,
				TestUint8:     2,
				TestUint16:    3,
				TestUint32:    4,
				TestUint64:    5,
				TestUintArray: []uint{1, 2},

				TestFloat32:      1.1,
				TestFloat64:      2.2,
				TestFloat64Array: []float64{1.1, 2.2},

				TestComplex64:  1i,
				TestComplex128: 2i,

				TestBool:      true,
				TestBoolArray: []bool{true, false},

				TestString: "Hello, Tests!",

				TestTime: time.Date(2000, 1, 2, 3, 4, 5, 0, time.UTC),

				TestURL: url.URL{Scheme: "https", Host: "example.com"},
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := allSupportedTypes{}
			if err := Bind(&got); err != nil {
				t.Fatal(err)
			}
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("Bind() = %v, want %v", got, tt.want)
			}
		})
	}
}
func TestBind_EnvVar(t *testing.T) {
	type testStruct struct {
		TestInt    int     `env:"TEST_INT" default:"1"`
		TestString string  `env:"TEST_STRING" default:"Default"`
		TestFloat  float32 `env:"TEST_FLOAT" default:"1.1"`
	}
	tests := []struct {
		name string
		env  map[string]string
		want testStruct
	}{
		{
			name: "Reads envs",
			env: map[string]string{
				"TEST_INT":        "2",
				"TEST_STRING":     "Hello, Tests!",
				"GOMP_TEST_FLOAT": "2.2",
			},
			want: testStruct{
				TestInt:    2,
				TestString: "Hello, Tests!",
				TestFloat:  2.2,
			},
		},
		{
			name: "Handles unset env",
			env:  map[string]string{},
			want: testStruct{
				TestInt:    1,
				TestString: "Default",
				TestFloat:  1.1,
			},
		},
		{
			name: "Handles invalid env",
			env: map[string]string{
				"TEST_INT":        "3a",
				"GOMP_TEST_FLOAT": "2.c",
			},
			want: testStruct{
				TestInt:    1,
				TestString: "Default",
				TestFloat:  1.1,
			},
		},
		{
			name: "App-specific Env takes precedence",
			env: map[string]string{
				"TEST_FLOAT":      "2.2",
				"GOMP_TEST_FLOAT": "3.3",
			},
			want: testStruct{
				TestInt:    1,
				TestString: "Default",
				TestFloat:  3.3,
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			for key, val := range tt.env {
				t.Setenv(key, val)
			}
			got := testStruct{}
			if err := Bind(&got); err != nil {
				t.Fatal(err)
			}
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("Bind() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestBind_BadValuesReturnError(t *testing.T) {
	//revive:disable:struct-tag
	type goodInt struct {
		TestInt int `default:"1"`
	}
	type badInt struct {
		TestInt int `default:"a"`
	}
	type badUint struct {
		TestUint uint `default:"b"`
	}
	type badFloat struct {
		TestFloat float32 `default:"c"`
	}
	type badComplex struct {
		TestComplex complex64 `default:"d"`
	}
	type badBool struct {
		TestBool bool `default:"e"`
	}
	type badSlice struct {
		TestSlice []int `default:"1,2,f"`
	}
	type badMap struct {
		TestMap map[string]string `default:"a=b"`
	}
	//revive:disable:enable-tag
	tests := []struct {
		name       string
		arg        any
		errChecker func(error) (error, bool)
	}{
		{
			name: "Int",
			arg:  &badInt{},
			errChecker: func(got error) (error, bool) {
				want := &strconv.NumError{
					Func: "ParseInt",
					Num:  "a",
					Err:  errors.New(""),
				}
				return want, errors.As(got, utils.GetPtr(want))
			},
		},
		{
			name: "Nested Int",
			arg: &struct {
				BadInt badInt
			}{
				BadInt: badInt{},
			},
			errChecker: func(got error) (error, bool) {
				want := &strconv.NumError{
					Func: "ParseInt",
					Num:  "a",
					Err:  errors.New(""),
				}
				return want, errors.As(got, utils.GetPtr(want))
			},
		},
		{
			name: "Uint",
			arg:  &badUint{},
			errChecker: func(got error) (error, bool) {
				want := &strconv.NumError{
					Func: "ParseUint",
					Num:  "b",
					Err:  errors.New(""),
				}
				return want, errors.As(got, utils.GetPtr(want))
			},
		},
		{
			name: "Float",
			arg:  &badFloat{},
			errChecker: func(got error) (error, bool) {
				want := &strconv.NumError{
					Func: "ParseFloat",
					Num:  "c",
					Err:  errors.New(""),
				}
				return want, errors.As(got, utils.GetPtr(want))
			},
		},
		{
			name: "Complex",
			arg:  &badComplex{},
			errChecker: func(got error) (error, bool) {
				want := &strconv.NumError{
					Func: "ParseComplex",
					Num:  "d",
					Err:  errors.New(""),
				}
				return want, errors.As(got, utils.GetPtr(want))
			},
		},
		{
			name: "Bool",
			arg:  &badBool{},
			errChecker: func(got error) (error, bool) {
				want := &strconv.NumError{
					Func: "ParseBool",
					Num:  "e",
					Err:  errors.New(""),
				}
				return want, errors.As(got, utils.GetPtr(want))
			},
		},
		{
			name: "Slice",
			arg:  &badSlice{},
			errChecker: func(got error) (error, bool) {
				want := &strconv.NumError{
					Func: "ParseInt",
					Num:  "f",
					Err:  errors.New(""),
				}
				return want, errors.As(got, utils.GetPtr(want))
			},
		},
		{
			name: "Maps not supported",
			arg:  &badMap{},
			errChecker: func(got error) (error, bool) {
				want := &errUnsupportedType{}
				return want, errors.As(got, utils.GetPtr(want))
			},
		},
		{
			name: "Not a pointer",
			arg:  goodInt{},
			errChecker: func(got error) (error, bool) {
				want := errPointerRequired
				return want, errors.Is(got, want)
			},
		},
		{
			name: "Not a struct",
			arg:  utils.GetPtr("foobar"),
			errChecker: func(got error) (error, bool) {
				want := errStructRequired
				return want, errors.Is(got, want)
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if err := Bind(tt.arg); err != nil {
				if tt.errChecker != nil {
					if want, ok := tt.errChecker(err); !ok {
						t.Errorf("Bind() = %v, want = %v", err, want)
					}
				}
			} else {
				t.Errorf("Bind() did not error")
			}
		})
	}
}
