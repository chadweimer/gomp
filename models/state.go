package models

// EntityState represents an enumeration of states that a recipe can be in
type EntityState string

const (
	// ActiveEntityState represents an active item
	ActiveEntityState EntityState = "active"

	// ArchivedEntityState represents an item that has been archived
	ArchivedEntityState EntityState = "archived"

	// DeletedEntityState represents an item that has been deleted
	DeletedEntityState EntityState = "deleted"
)
