package models

// AppInfo represents static information about the application (e.g., version)
type AppInfo struct {
	Version string `json:"version"`
}

// AppConfiguration represents the configuration for the application
type AppConfiguration struct {
	Title string `json:"title" db:"title"`
}
