package tasks_test

import (
	"context"
	"errors"
	"strings"
	"sync"
	"testing"
	"time"
	"uuid"

	"github.com/chadweimer/gomp/models"
	"github.com/chadweimer/gomp/tasks"
)

func TestTaskManager_Submit_Success(t *testing.T) {
	store := tasks.NewMemoryStore()
	manager := tasks.NewManager(store)
	defer manager.Close()

	done := make(chan struct{})
	task, err := manager.Submit(models.TaskTypeBackup, func(_ context.Context, report tasks.ProgressReporter) (map[string]any, error) {
		report(50, "Halfway")
		close(done)
		return map[string]any{"url": "/file.zip"}, nil
	})
	if err != nil {
		t.Fatalf("unexpected error submitting task: %v", err)
	}

	<-done

	// Wait for task completion
	var finalTask *models.Task
	for range 50 {
		finalTask, err = manager.Get(t.Context(), task.ID)
		if err == nil && finalTask.State == models.Completed {
			break
		}
		time.Sleep(10 * time.Millisecond)
	}

	if finalTask.State != models.Completed {
		t.Errorf("expected task state Completed, got %v", finalTask.State)
	}
	if finalTask.Progress == nil || *finalTask.Progress != 100 {
		t.Errorf("expected progress 100, got %v", finalTask.Progress)
	}
	if finalTask.Result == nil || (*finalTask.Result)["url"] != "/file.zip" {
		t.Errorf("expected result with url, got %v", finalTask.Result)
	}
}

func TestTaskManager_Submit_Failure(t *testing.T) {
	store := tasks.NewMemoryStore()
	manager := tasks.NewManager(store)
	defer manager.Close()

	expectedErr := errors.New("boom")
	task, err := manager.Submit(models.TaskTypeBackup, func(_ context.Context, _ tasks.ProgressReporter) (map[string]any, error) {
		return nil, expectedErr
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	var finalTask *models.Task
	for range 50 {
		finalTask, err = manager.Get(t.Context(), task.ID)
		if err == nil && finalTask.State == models.Failed {
			break
		}
		time.Sleep(10 * time.Millisecond)
	}

	if finalTask.State != models.Failed {
		t.Errorf("expected task state Failed, got %v", finalTask.State)
	}
	if finalTask.Error == nil || *finalTask.Error != "boom" {
		t.Errorf("expected error 'boom', got %v", finalTask.Error)
	}
}

func TestTaskManager_Submit_Panic(t *testing.T) {
	store := tasks.NewMemoryStore()
	manager := tasks.NewManager(store)
	defer manager.Close()

	task, err := manager.Submit(models.TaskTypeBackup, func(_ context.Context, _ tasks.ProgressReporter) (map[string]any, error) {
		panic("something went wrong")
	})
	if err != nil {
		t.Fatalf("unexpected error submitting task: %v", err)
	}

	var finalTask *models.Task
	for range 50 {
		finalTask, err = manager.Get(t.Context(), task.ID)
		if err == nil && finalTask.State == models.Failed {
			break
		}
		time.Sleep(10 * time.Millisecond)
	}

	if finalTask.State != models.Failed {
		t.Errorf("expected task state Failed on panic, got %v", finalTask.State)
	}
	if finalTask.Error == nil || !strings.Contains(*finalTask.Error, "task panicked: something went wrong") {
		t.Errorf("expected panic error message, got %v", finalTask.Error)
	}
}

func TestTaskManager_ConcurrentTasks(t *testing.T) {
	store := tasks.NewMemoryStore()
	manager := tasks.NewManager(store)
	defer manager.Close()

	started1 := make(chan struct{})
	release1 := make(chan struct{})
	started2 := make(chan struct{})
	release2 := make(chan struct{})

	_, err := manager.Submit(models.TaskTypeBackup, func(_ context.Context, _ tasks.ProgressReporter) (map[string]any, error) {
		close(started1)
		<-release1
		return nil, nil
	})
	if err != nil {
		t.Fatalf("failed to start first task: %v", err)
	}

	<-started1

	// Second task should also start concurrently
	_, err = manager.Submit(models.TaskTypeRestore, func(_ context.Context, _ tasks.ProgressReporter) (map[string]any, error) {
		close(started2)
		<-release2
		return nil, nil
	})
	if err != nil {
		t.Fatalf("failed to start second task: %v", err)
	}

	<-started2

	close(release1)
	close(release2)
}

func TestTaskManager_Shutdown_MarksFailed(t *testing.T) {
	store := tasks.NewMemoryStore()
	manager := tasks.NewManager(store)

	started := make(chan struct{})
	task, err := manager.Submit(models.TaskTypeBackup, func(ctx context.Context, _ tasks.ProgressReporter) (map[string]any, error) {
		close(started)
		<-ctx.Done()
		return nil, ctx.Err()
	})
	if err != nil {
		t.Fatalf("failed to submit task: %v", err)
	}

	<-started

	// Closing the manager triggers shutdown context cancellation
	manager.Close()

	var finalTask *models.Task
	for range 50 {
		finalTask, err = manager.Get(t.Context(), task.ID)
		if err == nil && finalTask.State == models.Failed {
			break
		}
		time.Sleep(10 * time.Millisecond)
	}

	if finalTask.State != models.Failed {
		t.Errorf("expected task state Failed on shutdown, got %v", finalTask.State)
	}
	if finalTask.Error == nil || *finalTask.Error != "server shutting down" {
		t.Errorf("expected error 'server shutting down', got %v", finalTask.Error)
	}
}

func TestTaskManager_Delete(t *testing.T) {
	store := tasks.NewMemoryStore()
	manager := tasks.NewManager(store)
	defer manager.Close()

	started := make(chan struct{})
	release := make(chan struct{})

	task, err := manager.Submit(models.TaskTypeBackup, func(_ context.Context, _ tasks.ProgressReporter) (map[string]any, error) {
		close(started)
		<-release
		return nil, nil
	})
	if err != nil {
		t.Fatalf("failed to submit: %v", err)
	}

	<-started

	// Deleting active task should fail
	err = manager.Delete(t.Context(), task.ID)
	if !errors.Is(err, tasks.ErrCannotDeleteActive) {
		t.Errorf("expected ErrCannotDeleteActive, got %v", err)
	}

	close(release)
	time.Sleep(50 * time.Millisecond)

	// Now delete should succeed
	err = manager.Delete(t.Context(), task.ID)
	if err != nil {
		t.Errorf("expected delete to succeed, got %v", err)
	}

	_, err = manager.Get(t.Context(), task.ID)
	if !errors.Is(err, tasks.ErrNotFound) {
		t.Errorf("expected ErrNotFound after delete, got %v", err)
	}
}

func TestMemoryStore_Pruning_Age(t *testing.T) {
	store := tasks.NewMemoryStore()

	now := time.Now()
	// Insert completed tasks
	for range 5 {
		completedAt := now.Add(-2 * time.Hour)
		task := &models.Task{
			ID:          uuid.New(),
			Type:        models.TaskTypeBackup,
			State:       models.Completed,
			CreatedAt:   now.Add(-3 * time.Hour),
			CompletedAt: &completedAt,
		}
		if err := store.Create(t.Context(), task); err != nil {
			t.Fatalf("failed to create task: %v", err)
		}
	}

	// Insert 1 active task
	activeTask := &models.Task{
		ID:        uuid.New(),
		Type:      models.TaskTypeBackup,
		State:     models.Running,
		CreatedAt: now,
	}
	if err := store.Create(t.Context(), activeTask); err != nil {
		t.Fatalf("failed to create active task: %v", err)
	}

	// Prune tasks older than 1 hour
	pruned, err := store.Prune(t.Context(), 1*time.Hour, 100)
	if err != nil {
		t.Fatalf("prune failed: %v", err)
	}
	if pruned != 5 {
		t.Errorf("expected 5 pruned tasks, got %d", pruned)
	}

	// Active task must still be present
	got, err := store.Get(t.Context(), activeTask.ID)
	if err != nil || got == nil {
		t.Errorf("expected active task to survive pruning, got %v", err)
	}
}

func TestMemoryStore_Pruning_Capacity(t *testing.T) {
	store := tasks.NewMemoryStore()

	now := time.Now()
	// Insert 5 completed tasks
	for range 5 {
		completedAt := now
		task := &models.Task{
			ID:          uuid.New(),
			Type:        models.TaskTypeBackup,
			State:       models.Completed,
			CreatedAt:   now,
			CompletedAt: &completedAt,
		}
		if err := store.Create(t.Context(), task); err != nil {
			t.Fatalf("failed to create task: %v", err)
		}
	}

	// Insert 1 active task
	activeTask := &models.Task{
		ID:        uuid.New(),
		Type:      models.TaskTypeBackup,
		State:     models.Running,
		CreatedAt: now,
	}
	if err := store.Create(t.Context(), activeTask); err != nil {
		t.Fatalf("failed to create active task: %v", err)
	}

	// Total tasks = 6. With maxAge = 0 (disabled) and maxCapacity = 3,
	// it should prune 3 oldest finished tasks to reach capacity 3.
	pruned, err := store.Prune(t.Context(), 0, 3)
	if err != nil {
		t.Fatalf("prune failed: %v", err)
	}
	if pruned != 3 {
		t.Errorf("expected 3 pruned tasks, got %d", pruned)
	}

	taskList, err := store.List(t.Context(), tasks.TaskFilter{})
	if err != nil {
		t.Fatalf("list failed: %v", err)
	}
	if len(taskList) != 3 {
		t.Errorf("expected 3 remaining tasks, got %d", len(taskList))
	}

	// Active task must still be present
	got, err := store.Get(t.Context(), activeTask.ID)
	if err != nil || got == nil {
		t.Errorf("expected active task to survive pruning, got %v", err)
	}
}

func TestMemoryStore_ListFiltering(t *testing.T) {
	store := tasks.NewMemoryStore()

	t1 := &models.Task{ID: uuid.New(), Type: models.TaskTypeBackup, State: models.Running, CreatedAt: time.Now()}
	t2 := &models.Task{ID: uuid.New(), Type: models.TaskTypeRestore, State: models.Completed, CreatedAt: time.Now()}
	t3 := &models.Task{ID: uuid.New(), Type: models.TaskTypeBackup, State: models.Completed, CreatedAt: time.Now()}

	_ = store.Create(t.Context(), t1)
	_ = store.Create(t.Context(), t2)
	_ = store.Create(t.Context(), t3)

	// Filter by state
	res, err := store.List(t.Context(), tasks.TaskFilter{States: []models.TaskState{models.Completed}})
	if err != nil || len(res) != 2 {
		t.Errorf("expected 2 completed tasks, got %d", len(res))
	}

	// Filter by type
	res, err = store.List(t.Context(), tasks.TaskFilter{Types: []models.TaskType{models.TaskTypeBackup}})
	if err != nil || len(res) != 2 {
		t.Errorf("expected 2 backup tasks, got %d", len(res))
	}

	// Filter by both
	res, err = store.List(t.Context(), tasks.TaskFilter{
		States: []models.TaskState{models.Completed},
		Types:  []models.TaskType{models.TaskTypeBackup},
	})
	if err != nil || len(res) != 1 {
		t.Errorf("expected 1 task matching both, got %d", len(res))
	}
}

func TestMemoryStore_ThreadSafety(t *testing.T) {
	store := tasks.NewMemoryStore()

	var wg sync.WaitGroup
	for range 20 {
		wg.Go(func() {
			id := uuid.New()
			task := &models.Task{
				ID:        id,
				Type:      models.TaskTypeBackup,
				State:     models.Running,
				CreatedAt: time.Now(),
			}
			_ = store.Create(context.Background(), task)
			task.State = models.Failed
			_ = store.Update(context.Background(), task)
			_, _ = store.Get(context.Background(), id)
			_, _ = store.List(context.Background(), tasks.TaskFilter{})
		})
	}
	wg.Wait()
}
