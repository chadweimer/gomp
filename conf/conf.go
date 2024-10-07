package conf

import (
	"encoding"
	"fmt"
	"log/slog"
	"os"
	"reflect"
	"strconv"
	"strings"
)

var textMarshalerType = reflect.TypeFor[encoding.TextMarshaler]()

// Bind initializes the supplied object based on assoiciated struct tags
func Bind(ptr any) error {
	val := reflect.ValueOf(ptr)
	if val.Kind() != reflect.Pointer {
		return errPointerRequired
	}

	val = val.Elem()
	if val.Kind() != reflect.Struct {
		return errStructRequired
	}

	return bindStruct(val)
}

func bindStruct(objVal reflect.Value) error {
	for i := 0; i < objVal.NumField(); i++ {
		field := objVal.Type().Field(i)
		if !field.IsExported() {
			continue
		}

		fieldVal := resolvePointers(objVal.Field(i))

		// If this is a struct, we need to recurse unless it's a TextUnmarshaler
		if fieldVal.Kind() == reflect.Struct && !fieldVal.Type().AssignableTo(textMarshalerType) {
			if err := bindStruct(fieldVal); err != nil {
				return err
			}
		} else {
			if err := setToDefault(field, fieldVal); err != nil {
				return err
			}
			setFromEnv(field, fieldVal)
		}
	}

	return nil
}

func resolvePointers(val reflect.Value) reflect.Value {
	for val.Type().Kind() == reflect.Pointer {
		if val.IsNil() {
			val.Set(reflect.New(val.Type().Elem()))
		}
		val = val.Elem()
	}
	return val
}

func setToDefault(field reflect.StructField, val reflect.Value) error {
	if defaultStr, ok := field.Tag.Lookup("default"); ok {
		if err := set(val, defaultStr); err != nil {
			return fmt.Errorf("improperly defined default on configuration field %s: %w", field.Name, err)
		}
	}

	return nil
}

func setFromEnv(field reflect.StructField, val reflect.Value) {
	envName, ok := field.Tag.Lookup("env")
	if !ok {
		envName = strings.ToUpper(field.Name)
	}

	fullEnvName := "GOMP_" + envName
	// Try the application specific name (prefixed with GOMP_)...
	envStr, ok := os.LookupEnv(fullEnvName)
	// ... and only if not found, try the base name
	if ok {
		envName = fullEnvName
	} else {
		envStr, ok = os.LookupEnv(envName)
	}

	if ok {
		if err := set(val, envStr); err != nil {
			slog.Warn("Failed to convert environment variable. Proceeding with existing value",
				"type", val.Type,
				"envName", envName,
				"envVal", envStr,
				"error", err)
		}
	}
}

func set(val reflect.Value, str string) error {
	switch val.Type().Kind() {
	case reflect.Struct:
		if unmarshaler, ok := val.Addr().Interface().(encoding.TextUnmarshaler); ok {
			return unmarshaler.UnmarshalText([]byte(str))
		}
		return &errUnsupportedType{val.Type()}

	case reflect.String:
		val.SetString(str)
		return nil

	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
		return convertAndSet(str, func(str string) (int64, error) {
			return strconv.ParseInt(str, 0, val.Type().Bits())
		}, val.SetInt)

	case reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64:
		return convertAndSet(str, func(str string) (uint64, error) {
			return strconv.ParseUint(str, 0, val.Type().Bits())
		}, val.SetUint)

	case reflect.Float32, reflect.Float64:
		return convertAndSet(str, func(str string) (float64, error) {
			return strconv.ParseFloat(str, val.Type().Bits())
		}, val.SetFloat)

	case reflect.Complex64, reflect.Complex128:
		return convertAndSet(str, func(str string) (complex128, error) {
			return strconv.ParseComplex(str, val.Type().Bits())
		}, val.SetComplex)

	case reflect.Bool:
		return convertAndSet(str, strconv.ParseBool, val.SetBool)

	case reflect.Array, reflect.Slice:
		return convertAndSet(str, func(str string) (reflect.Value, error) {
			valType := val.Type()
			segments := strings.Split(str, ",")
			newVal := reflect.MakeSlice(valType, 0, len(segments))
			for _, segment := range segments {
				element := reflect.New(valType.Elem()).Elem()
				if err := set(element, strings.TrimSpace(segment)); err != nil {
					return reflect.Zero(valType), err
				}
				newVal = reflect.Append(newVal, element)
			}
			return newVal, nil
		}, val.Set)

	default:
		return &errUnsupportedType{val.Type()}
	}
}

func convertAndSet[T any](str string, converter func(str string) (T, error), setter func(val T)) error {
	typed, err := converter(str)
	if err != nil {
		return err
	}
	setter(typed)
	return nil
}
