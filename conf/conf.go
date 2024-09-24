package conf

import (
	"encoding"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"reflect"
	"strconv"
	"strings"
)

var textUnmarshalerType reflect.Type = reflect.TypeFor[encoding.TextUnmarshaler]()

type errUnsupportedType struct {
	fieldType reflect.Type
}

func (e errUnsupportedType) Error() string {
	return fmt.Sprintf("unsupported field type: %s", e.fieldType)
}

// Bind initializes the supplied object based on assoiciated struct tags
func Bind(ptr any) error {
	val := reflect.ValueOf(ptr)
	if val.Kind() != reflect.Pointer {
		return errors.New("bind requires pointer types")
	}

	val = val.Elem()
	if val.Kind() != reflect.Struct {
		return errors.New("bind requires struct types")
	}

	return bindValue(val)
}

func bindValue(objVal reflect.Value) error {
	for i := 0; i < objVal.NumField(); i++ {
		field := objVal.Type().Field(i)
		if !field.IsExported() {
			continue
		}

		fieldVal := objVal.Field(i)
		if fieldVal.Kind() == reflect.Struct && fieldVal.Type().AssignableTo(textUnmarshalerType) {
			if err := bindValue(fieldVal); err != nil {
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
	if val.Type().AssignableTo(textUnmarshalerType) {
		unmarshaler := val.Interface().(encoding.TextUnmarshaler)
		return unmarshaler.UnmarshalText([]byte(str))
	}

	switch val.Type().Kind() {
	case reflect.String:
		val.SetString(str)

	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
		typed, err := strconv.ParseInt(str, 10, val.Type().Bits())
		if err != nil {
			return err
		}
		val.SetInt(typed)

	case reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64:
		typed, err := strconv.ParseUint(str, 10, val.Type().Bits())
		if err != nil {
			return err
		}
		val.SetUint(typed)

	case reflect.Float32, reflect.Float64:
		typed, err := strconv.ParseFloat(str, val.Type().Bits())
		if err != nil {
			return err
		}
		val.SetFloat(typed)

	case reflect.Complex64, reflect.Complex128:
		typed, err := strconv.ParseComplex(str, val.Type().Bits())
		if err != nil {
			return err
		}
		val.SetComplex(typed)

	case reflect.Bool:
		typed, err := strconv.ParseBool(str)
		if err != nil {
			return err
		}
		val.SetBool(typed)

	case reflect.Array, reflect.Slice:
		elementType := val.Type().Elem()
		segments := strings.Split(str, ",")
		newVal := reflect.MakeSlice(val.Type(), 0, len(segments))
		for _, segment := range segments {
			element := reflect.New(elementType).Elem()
			if err := set(element, strings.TrimSpace(segment)); err != nil {
				return err
			}
			newVal = reflect.Append(newVal, element)
		}
		val.Set(newVal)

	case reflect.Pointer:
		ptrType := val.Type().Elem()
		if val.IsNil() {
			val.Set(reflect.New(ptrType))
		}
		return set(val.Elem(), str)

	default:
		return errUnsupportedType{val.Type()}
	}

	return nil
}
