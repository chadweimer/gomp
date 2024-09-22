package conf

import (
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

// MustBind initializes the supplied object based on assoiciated struct tags
func MustBind(ptr any) {
	objType := reflect.TypeOf(ptr)
	if objType.Kind() != reflect.Pointer {
		panic("bind requires pointer types")
	}

	objType = objType.Elem()
	if objType.Kind() != reflect.Struct {
		panic("bind requires struct types")
	}

	objVal := reflect.ValueOf(ptr).Elem()
	load(objType, objVal)
}

func load(objType reflect.Type, objVal reflect.Value) {
	for i := 0; i < objType.NumField(); i++ {
		field := objType.Field(i)
		val := objVal.Field(i)
		if field.Type.Kind() == reflect.Struct {
			load(field.Type, val)
		} else {
			setToDefault(field, val)
			setFromEnv(field, val)
		}
	}
}

func setToDefault(field reflect.StructField, val reflect.Value) {
	if defaultStr, ok := field.Tag.Lookup("default"); ok {
		if err := set(field.Type, val, defaultStr); err != nil {
			panic(fmt.Errorf("improperly defined default on configuration field %s", field.Name))
		}
	}
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
		if err := set(field.Type, val, envStr); err != nil {
			slog.Warn("Failed to convert environment variable. Proceeding with default value",
				"env", envName,
				"type", val.Type,
				"val", envStr,
				"error", err)
		}
	}
}

func set(fieldType reflect.Type, val reflect.Value, str string) error {
	switch fieldType.Kind() {
	// case fieldType == reflect.TypeFor[[]string]():
	// 	val.Set(reflect.ValueOf(strings.Split(str, ",")))

	case reflect.String:
		val.SetString(str)

	case reflect.Int:
		fallthrough
	case reflect.Int8:
		fallthrough
	case reflect.Int16:
		fallthrough
	case reflect.Int32:
		fallthrough
	case reflect.Int64:
		typed, err := getValue(fieldType, str)
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
		typed, err := getValue(fieldType, str)
		if err != nil {
			return err
		}
		val.SetUint(typed.(uint64))

	case reflect.Float32:
		fallthrough
	case reflect.Float64:
		typed, err := getValue(fieldType, str)
		if err != nil {
			return err
		}
		val.SetFloat(typed.(float64))

	case reflect.Complex64:
		fallthrough
	case reflect.Complex128:
		typed, err := getValue(fieldType, str)
		if err != nil {
			return err
		}
		val.SetComplex(typed.(complex128))

	case reflect.Bool:
		typed, err := getValue(fieldType, str)
		if err != nil {
			return err
		}
		val.SetBool(typed.(bool))

	case reflect.Array:
		fallthrough
	case reflect.Slice:
		val.Clear()
		elementType := fieldType.Elem()
		for _, segment := range strings.Split(str, ",") {
			element := reflect.New(elementType).Elem()
			if err := set(elementType, element, strings.TrimSpace(segment)); err != nil {
				return err
			}
			val.Set(reflect.Append(val, element))
		}

	case reflect.Pointer:
		ptrType := fieldType.Elem()
		if val.IsNil() {
			val.Set(reflect.New(ptrType))
		}
		return set(ptrType, val.Elem(), str)

	default:
		return errUnsupportedType{fieldType}
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
