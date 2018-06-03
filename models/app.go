package models

// AppConfiguration represents the configuration for the application
type AppConfiguration struct {
	Title string `json:"title" db:"title"`
}
