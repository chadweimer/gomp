package tasks

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"sync"
	"time"
	"uuid"

	"github.com/chadweimer/gomp/models"
	"github.com/samber/lo"
)

// Manager coordinates the creation, execution, state updates, and cancellation of background tasks.
type Manager struct {
	store Store

	mu            sync.Mutex
	runningTasks  map[uuid.UUID]context.CancelCauseFunc
	pruningCtx    context.Context
	pruningCancel context.CancelFunc
}

// NewManager creates a new background TaskManager.
func NewManager(store Store) *Manager {
	pruningCtx, pruningCancel := context.WithCancel(context.Background())
	m := &Manager{
		store:         store,
		runningTasks:  make(map[uuid.UUID]context.CancelCauseFunc),
		pruningCtx:    pruningCtx,
		pruningCancel: pruningCancel,
	}

	// Start a background pruner that periodically removes stale completed tasks
	go m.startPruner(10*time.Minute, 1*time.Hour, 20)

	return m
}

// Close gracefully stops the TaskManager pruner and cancels running tasks.
func (m *Manager) Close() {
	select {
	case <-m.pruningCtx.Done():
		// already closed
	default:
		m.pruningCancel()
	}

	m.mu.Lock()
	defer m.mu.Unlock()
	for _, cancel := range m.runningTasks {
		cancel(errors.New("server shutting down"))
	}
}

// Submit enqueues and asynchronously launches a new background task.
func (m *Manager) Submit(taskType models.TaskType, fn TaskFunc) (*models.Task, error) {
	task, ctx, err := m.createTask(taskType)
	if err != nil {
		return nil, err
	}

	go m.runWorker(ctx, task.ID, fn)

	return task, nil
}

func (m *Manager) createTask(taskType models.TaskType) (*models.Task, context.Context, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	id := uuid.New()
	task := models.Task{
		ID:        id,
		Type:      taskType,
		State:     models.Running,
		Stage:     new("Starting"),
		Progress:  new(0),
		CreatedAt: time.Now(),
	}

	ctx, cancel := context.WithCancelCause(context.Background())

	if err := m.store.Create(ctx, &task); err != nil {
		cancel(err)
		return nil, nil, err
	}

	m.runningTasks[id] = cancel
	return &task, ctx, nil
}

func (m *Manager) runWorker(ctx context.Context, id uuid.UUID, fn TaskFunc) {
	report := func(percent int, stage string) {
		m.mu.Lock()
		defer m.mu.Unlock()

		task, err := m.store.Get(ctx, id)
		if err != nil {
			slog.Warn("Failed to get task for progress update", "taskId", id, "error", err)
		} else if task.State == models.Running {
			task.Progress = &percent
			task.Stage = &stage
			if updateErr := m.store.Update(ctx, task); updateErr != nil {
				slog.Warn("Failed to update task progress", "taskId", id, "error", updateErr)
			}
		}
	}

	var result map[string]any
	var execErr error

	defer func() {
		if r := recover(); r != nil {
			execErr = fmt.Errorf("task panicked: %v", r)
		}

		m.runWorkerComplete(ctx, id, result, execErr)
	}()

	result, execErr = fn(ctx, report)
}

func (m *Manager) runWorkerComplete(ctx context.Context, id uuid.UUID, result map[string]any, execErr error) {
	completedAt := time.Now()

	m.mu.Lock()
	cancel, ok := m.runningTasks[id]
	if ok {
		delete(m.runningTasks, id)
	}
	defer func() {
		if ok {
			cancel(nil)
		}
	}()
	defer m.mu.Unlock()

	task, err := m.store.Get(ctx, id)
	if err != nil {
		return
	}

	task.CompletedAt = &completedAt

	// Check context cancellation first (e.g. server shutdown)
	if ctx.Err() != nil {
		task.State = models.Failed
		cause := context.Cause(ctx)
		errMsg := lo.Ternary(cause != nil, cause.Error(), ctx.Err().Error())
		task.Error = &errMsg
	} else if execErr != nil {
		task.State = models.Failed
		errMsg := execErr.Error()
		task.Error = &errMsg
	} else {
		task.State = models.Completed
		task.Progress = new(100)
		task.Stage = new("Completed")
		if result != nil {
			task.Result = &result
		}
	}

	if updateErr := m.store.Update(ctx, task); updateErr != nil {
		slog.Warn("Failed to update task after completion", "taskId", id, "error", updateErr)
	}
}

// Get returns the task with the given ID.
func (m *Manager) Get(ctx context.Context, id uuid.UUID) (*models.Task, error) {
	return m.store.Get(ctx, id)
}

// List returns tasks matching the specified filter criteria.
func (m *Manager) List(ctx context.Context, filter TaskFilter) ([]models.Task, error) {
	return m.store.List(ctx, filter)
}

func (m *Manager) startPruner(interval time.Duration, maxAge time.Duration, maxCapacity int) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		select {
		case <-m.pruningCtx.Done():
			return
		case <-ticker.C:
			ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			pruned, err := m.store.Prune(ctx, maxAge, maxCapacity)
			cancel()
			if err != nil {
				slog.Warn("Failed to prune task store", "error", err)
			} else if pruned > 0 {
				slog.Debug("Pruned completed tasks", "count", pruned)
			}
		}
	}
}
