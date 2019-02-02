package models

// AppConfiguration represents the configuration for the application
//
// swagger:model appConfiguration
type AppConfiguration struct {
	// the title of the application
	//
	// required: true
	// min: 1
	Title string `json:"title" db:"title"`
}
