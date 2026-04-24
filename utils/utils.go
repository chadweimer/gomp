package utils

// GetPtr returns a pointer to the specified object
func GetPtr[T any](obj T) *T {
	return &obj
}
