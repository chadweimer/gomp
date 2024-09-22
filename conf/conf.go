package conf

import (
	"errors"
	"fmt"
	"log/slog"
	"os"
	"reflect"
	"strconv"
	"strings"
)

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
		fieldVal := objVal.Field(i)
		if fieldVal.Kind() == reflect.Struct {
			if err := bindValue(fieldVal); err != nil {
				return err
			}
		} else {
			field := objVal.Type().Field(i)
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
	switch val.Type().Kind() {
	case reflect.String:
		typed, _ := getValue(val.Type(), str)
		val.SetString(typed.(string))

	case reflect.Int:
		fallthrough
	case reflect.Int8:
		fallthrough
	case reflect.Int16:
		fallthrough
	case reflect.Int32:
		fallthrough
	case reflect.Int64:
		typed, err := getValue(val.Type(), str)
		if err != nil {
			return err
		}
		val.SetInt(typed.(int64))

	case reflect.Uint:
		fallthrough
	case reflect.Uint8:
		fallthrough
	case reflect.Uint16:
		fallthrough
	case reflect.Uint32:
		fallthrough
	case reflect.Uint64:
		typed, err := getValue(val.Type(), str)
		if err != nil {
			return err
		}
		val.SetUint(typed.(uint64))

	case reflect.Float32:
		fallthrough
	case reflect.Float64:
		typed, err := getValue(val.Type(), str)
		if err != nil {
			return err
		}
		val.SetFloat(typed.(float64))

	case reflect.Complex64:
		fallthrough
	case reflect.Complex128:
		typed, err := getValue(val.Type(), str)
		if err != nil {
			return err
		}
		val.SetComplex(typed.(complex128))

	case reflect.Bool:
		typed, err := getValue(val.Type(), str)
		if err != nil {
			return err
		}
		val.SetBool(typed.(bool))

	case reflect.Array:
		fallthrough
	case reflect.Slice:
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

func getValue(fieldType reflect.Type, str string) (any, error) {
	switch fieldType.Kind() {
	case reflect.String:
		return str, nil

	case reflect.Int:
		fallthrough
	case reflect.Int8:
		fallthrough
	case reflect.Int16:
		fallthrough
	case reflect.Int32:
		fallthrough
	case reflect.Int64:
		typed, err := strconv.ParseInt(str, 10, fieldType.Bits())
		if err != nil {
			return nil, err
		}
		return typed, nil

	case reflect.Uint:
		fallthrough
	case reflect.Uint8:
		fallthrough
	case reflect.Uint16:
		fallthrough
	case reflect.Uint32:
		fallthrough
	case reflect.Uint64:
		typed, err := strconv.ParseUint(str, 10, fieldType.Bits())
		if err != nil {
			return nil, err
		}
		return typed, nil

	case reflect.Float32:
		fallthrough
	case reflect.Float64:
		typed, err := strconv.ParseFloat(str, fieldType.Bits())
		if err != nil {
			return nil, err
		}
		return typed, nil

	case reflect.Complex64:
		fallthrough
	case reflect.Complex128:
		typed, err := strconv.ParseComplex(str, fieldType.Bits())
		if err != nil {
			return nil, err
		}
		return typed, nil

	case reflect.Bool:
		typed, err := strconv.ParseBool(str)
		if err != nil {
			return nil, err
		}
		return typed, nil
	}

	return nil, errUnsupportedType{fieldType}
}
