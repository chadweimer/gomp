package tasks

import (
	"context"
	"errors"
	"time"
	"uuid"

	"github.com/chadweimer/gomp/models"
)

var (
	// ErrTaskExists is returned when a task with the specified ID already exists in the store.
	ErrTaskExists = errors.New("task with ID already exists")
	// ErrNotFound is returned when a requested task does not exist.
	ErrNotFound = errors.New("task not found")
)

// TaskFilter specifies criteria for filtering tasks when listing.
type TaskFilter struct {
	States []models.TaskState
	Types  []models.TaskType
}

// Store defines persistence operations for background tasks.
// Designed with a clean interface to allow plugging in future stores (e.g. Redis/Valkey).
type Store interface {
	Create(ctx context.Context, task *models.Task) error
	Get(ctx context.Context, id uuid.UUID) (*models.Task, error)
	Update(ctx context.Context, task *models.Task) error
	List(ctx context.Context, filter TaskFilter) ([]models.Task, error)
	Prune(ctx context.Context, maxAge time.Duration, maxCapacity int) (int, error)
}

// ProgressReporter is a callback for background jobs to report percentage and stage description.
type ProgressReporter func(percent int, stage string)

// TaskFunc is the function signature executed asynchronously by a worker.
type TaskFunc func(ctx context.Context, report ProgressReporter) (result map[string]any, err error)
