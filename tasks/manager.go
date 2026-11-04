package tasks

import (
	"context"
	"errors"
	"log/slog"
	"sync"
	"time"
	"uuid"

	"github.com/chadweimer/gomp/models"
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

// Close gracefully stops the TaskManager pruner and cancels running cancellable tasks.
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
func (m *Manager) Submit(taskType models.TaskType, cancellable bool, fn TaskFunc) (*models.Task, error) {
	task, ctx, err := m.createTask(taskType, cancellable)
	if err != nil {
		return nil, err
	}

	go m.runWorker(ctx, task.ID, fn)

	return task, nil
}

func (m *Manager) createTask(taskType models.TaskType, cancellable bool) (*models.Task, context.Context, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	id := uuid.New()
	task := models.Task{
		ID:          id,
		Type:        taskType,
		State:       models.TaskStateRunning,
		Stage:       new("Starting"),
		Progress:    new(0),
		Cancellable: cancellable,
		CreatedAt:   time.Now(),
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

		t, err := m.store.Get(ctx, id)
		if err == nil && t.State == models.TaskStateRunning {
			t.Progress = &percent
			t.Stage = &stage
			_ = m.store.Update(ctx, t)
		}
	}

	result, execErr := fn(ctx, report)
	completedAt := time.Now()

	m.mu.Lock()
	defer m.mu.Unlock()

	delete(m.runningTasks, id)

	t, err := m.store.Get(ctx, id)
	if err != nil {
		return
	}

	t.CompletedAt = &completedAt

	// Check cancellation first
	if ctx.Err() != nil {
		t.State = models.TaskStateCancelled
		cause := context.Cause(ctx)
		var errMsg string
		if cause != nil {
			errMsg = cause.Error()
		} else {
			errMsg = ctx.Err().Error()
		}
		t.Error = &errMsg
	} else if execErr != nil {
		t.State = models.TaskStateFailed
		errMsg := execErr.Error()
		t.Error = &errMsg
	} else {
		t.State = models.TaskStateCompleted
		t.Progress = new(100)
		t.Stage = new("Completed")
		if result != nil {
			t.Result = &result
		}
	}

	_ = m.store.Update(ctx, t)
}

// Get returns the task with the given ID.
func (m *Manager) Get(ctx context.Context, id uuid.UUID) (*models.Task, error) {
	return m.store.Get(ctx, id)
}

// List returns tasks matching the specified filter criteria.
func (m *Manager) List(ctx context.Context, filter TaskFilter) ([]models.Task, error) {
	return m.store.List(ctx, filter)
}

// UpdateState transitions a task's state, specifically supporting cancellation.
func (m *Manager) UpdateState(ctx context.Context, id uuid.UUID, newState models.TaskState) (*models.Task, error) {
	if newState != models.TaskStateCancelled {
		return nil, errors.New("unsupported state transition")
	}

	m.mu.Lock()
	task, err := m.store.Get(ctx, id)
	if err != nil {
		m.mu.Unlock()
		return nil, err
	}

	if isTerminal(task.State) {
		m.mu.Unlock()
		return nil, ErrCannotCancelFinished
	}

	if !task.Cancellable {
		m.mu.Unlock()
		return nil, ErrNotCancellable
	}

	cancel, running := m.runningTasks[id]
	if running {
		cancel(ErrTaskCancelled)
	}
	m.mu.Unlock()

	// Wait briefly for worker to complete transition or query updated task
	deadline := time.Now().Add(500 * time.Millisecond)
	for time.Now().Before(deadline) {
		updated, err := m.store.Get(ctx, id)
		if err == nil && updated.State == models.TaskStateCancelled {
			return updated, nil
		}
		time.Sleep(20 * time.Millisecond)
	}

	return m.store.Get(ctx, id)
}

// Delete permanently removes a finished task record from the store.
func (m *Manager) Delete(ctx context.Context, id uuid.UUID) error {
	m.mu.Lock()
	task, err := m.store.Get(ctx, id)
	if err != nil {
		m.mu.Unlock()
		return err
	}

	if !isTerminal(task.State) {
		m.mu.Unlock()
		return ErrCannotDeleteActive
	}
	m.mu.Unlock()

	return m.store.Delete(ctx, id)
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
