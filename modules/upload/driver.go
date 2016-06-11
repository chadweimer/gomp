package upload

// Driver represents an abstraction layer for handling file uploads
type Driver interface {
	Save(filePath string, data []byte) error
	List(dirPath string) ([]FileInfo, error)
	Delete(filePath string) error
	DeleteAll(dirPath string) error
}

type FileInfo struct {
	Name         string
	URL          string
	ThumbnailURL string
}
