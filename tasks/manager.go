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

	mu           sync.Mutex
	runningTasks map[uuid.UUID]context.CancelCauseFunc
	stopPruning  chan struct{}
}

// NewManager creates a new background TaskManager.
func NewManager(store Store) *Manager {
	m := &Manager{
		store:        store,
		runningTasks: make(map[uuid.UUID]context.CancelCauseFunc),
		stopPruning:  make(chan struct{}),
	}

	// Start a background pruner that periodically removes stale completed tasks
	go m.startPruner(10*time.Minute, 1*time.Hour, 500)

	return m
}

// Close gracefully stops the TaskManager pruner and cancels running cancellable tasks.
func (m *Manager) Close() {
	select {
	case <-m.stopPruning:
		// already closed
	default:
		close(m.stopPruning)
	}

	m.mu.Lock()
	defer m.mu.Unlock()
	for _, cancel := range m.runningTasks {
		cancel(errors.New("server shutting down"))
	}
}

// Submit enqueues and asynchronously launches a new background task.
func (m *Manager) Submit(taskType models.TaskType, cancellable bool, fn TaskFunc) (*models.Task, error) {
	m.mu.Lock()

	id := uuid.New()
	now := time.Now()
	task := models.Task{
		ID:          id,
		Type:        taskType,
		State:       models.Queued,
		Cancellable: cancellable,
		CreatedAt:   now,
	}

	ctx, cancel := context.WithCancelCause(context.Background())

	if err := m.store.Create(ctx, &task); err != nil {
		m.mu.Unlock()
		cancel(nil)
		return nil, err
	}

	m.runningTasks[id] = cancel
	m.mu.Unlock()

	go m.runWorker(id, ctx, fn)

	return &task, nil
}

func (m *Manager) runWorker(id uuid.UUID, ctx context.Context, fn TaskFunc) {
	startedAt := time.Now()
	initialProgress := 0
	initialStage := "Starting"

	m.mu.Lock()
	task, err := m.store.Get(ctx, id)
	if err == nil {
		task.State = models.Running
		task.StartedAt = &startedAt
		task.Progress = &initialProgress
		task.Stage = &initialStage
		_ = m.store.Update(ctx, task)
	}
	m.mu.Unlock()

	report := func(percent int, stage string) {
		m.mu.Lock()
		defer m.mu.Unlock()

		t, err := m.store.Get(ctx, id)
		if err == nil && t.State == models.Running {
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
		t.State = models.Cancelled
		cause := context.Cause(ctx)
		var errMsg string
		if cause != nil {
			errMsg = cause.Error()
		} else {
			errMsg = ctx.Err().Error()
		}
		t.Error = &errMsg
	} else if execErr != nil {
		t.State = models.Failed
		errMsg := execErr.Error()
		t.Error = &errMsg
	} else {
		t.State = models.Completed
		p := 100
		t.Progress = &p
		stage := "Completed"
		t.Stage = &stage
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
	if newState != models.Cancelled {
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
		if err == nil && updated.State == models.Cancelled {
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
		case <-m.stopPruning:
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
