package utils

// GetPtr returns a pointer to the specific object
func GetPtr[T any](str T) *T {
	return &str
}
