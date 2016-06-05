package upload

// Driver represents an abstraction layer for handling file uploads
type Driver interface {
	Save(filePath string, data []byte) error
	List(dirPath string) ([]string, []string, []string, error)
	Delete(filePath string) error
	DeleteAll(dirPath string) error
}
