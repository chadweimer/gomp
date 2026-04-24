package utils

import "fmt"

// GetPtr returns a pointer to the specified object
func GetPtr[T any](obj T) *T {
	return &obj
}

// Trap executes the provided operation function and, if it returns an error, executes the cleanup function.
func Trap(op func() error, cleanup func() error) error {
	if err := op(); err != nil {
		cleanupErr := cleanup()
		if cleanupErr != nil {
			return fmt.Errorf("operation error: %w; cleanup error: %v", err, cleanupErr)
		}
		return err
	}
	return nil
}
