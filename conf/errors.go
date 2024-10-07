package conf

import (
	"errors"
	"fmt"
	"reflect"
)

var (
	errPointerRequired = errors.New("bind requires pointer types")
	errStructRequired  = errors.New("bind requires struct types")
)

type errUnsupportedType struct {
	fieldType reflect.Type
}

func (e *errUnsupportedType) Error() string {
	return fmt.Sprintf("unsupported field type: %s", e.fieldType)
}
