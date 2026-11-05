package api

import (
	"context"
	"testing"
	"time"
	"uuid"

	"github.com/chadweimer/gomp/infra"
	"github.com/chadweimer/gomp/models"
	"github.com/chadweimer/gomp/tasks"
)

func TestListTasks(t *testing.T) {
	store := tasks.NewMemoryStore()
	manager := tasks.NewManager(store)
	defer manager.Close()

	api := apiHandler{
		tokenHandler: infra.NewTokenHandler([]string{"secure-key"}),
		taskManager:  manager,
	}

	// Create test tasks
	t1, err := manager.Submit(models.TaskTypeBackup, func(_ context.Context, _ tasks.ProgressReporter) (map[string]any, error) {
		return nil, nil
	})
	if err != nil {
		t.Fatalf("failed to submit first task: %v", err)
	}

	for range 50 {
		task, err := manager.Get(t.Context(), t1.ID)
		if err == nil && task.State == models.Completed {
			break
		}
		time.Sleep(10 * time.Millisecond)
	}

	t2, err := manager.Submit(models.TaskTypeRestore, func(_ context.Context, _ tasks.ProgressReporter) (map[string]any, error) {
		return nil, nil
	})
	if err != nil {
		t.Fatalf("failed to submit second task: %v", err)
	}

	for range 50 {
		task, err := manager.Get(t.Context(), t2.ID)
		if err == nil && task.State == models.Completed {
			break
		}
		time.Sleep(10 * time.Millisecond)
	}

	// List all
	resp, err := api.ListTasks(t.Context(), ListTasksRequestObject{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	taskList, ok := resp.(ListTasks200JSONResponse)
	if !ok || len(taskList) < 2 {
		t.Fatalf("expected at least 2 tasks, got %v", resp)
	}

	// Filter by state
	completedState := []models.TaskState{models.Completed}
	resp, err = api.ListTasks(t.Context(), ListTasksRequestObject{
		Params: ListTasksParams{States: &completedState},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	taskList, ok = resp.(ListTasks200JSONResponse)
	if !ok {
		t.Fatalf("expected 200 response, got %T", resp)
	}
	for _, task := range taskList {
		if task.State != models.Completed {
			t.Errorf("expected Completed state, got %v", task.State)
		}
	}

	// Filter by types
	bTypes := []models.TaskType{models.TaskTypeBackup}
	resp, err = api.ListTasks(t.Context(), ListTasksRequestObject{
		Params: ListTasksParams{Types: &bTypes},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	taskList, ok = resp.(ListTasks200JSONResponse)
	if !ok {
		t.Fatalf("expected 200 response, got %T", resp)
	}
	for _, task := range taskList {
		if task.Type != models.TaskTypeBackup {
			t.Errorf("expected Backup type, got %v", task.Type)
		}
	}

	_ = t1
	_ = t2
}

func TestGetTaskByID(t *testing.T) {
	store := tasks.NewMemoryStore()
	manager := tasks.NewManager(store)
	defer manager.Close()

	api := apiHandler{
		tokenHandler: infra.NewTokenHandler([]string{"secure-key"}),
		taskManager:  manager,
	}

	task, _ := manager.Submit(models.TaskTypeBackup, func(_ context.Context, _ tasks.ProgressReporter) (map[string]any, error) {
		return nil, nil
	})

	// Found
	resp, err := api.GetTaskByID(t.Context(), GetTaskByIDRequestObject{TaskID: task.ID})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	taskResp, ok := resp.(GetTaskByID200JSONResponse)
	if !ok || taskResp.ID != task.ID {
		t.Errorf("expected task id %v, got %T", task.ID, resp)
	}

	// Not Found
	resp, err = api.GetTaskByID(t.Context(), GetTaskByIDRequestObject{TaskID: uuid.New()})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if _, ok := resp.(GetTaskByID404Response); !ok {
		t.Errorf("expected 404 response, got %T", resp)
	}
}

func TestDeleteTaskByID(t *testing.T) {
	store := tasks.NewMemoryStore()
	manager := tasks.NewManager(store)
	defer manager.Close()

	api := apiHandler{
		tokenHandler: infra.NewTokenHandler([]string{"secure-key"}),
		taskManager:  manager,
	}

	started := make(chan struct{})
	release := make(chan struct{})

	activeTask, _ := manager.Submit(models.TaskTypeBackup, func(_ context.Context, _ tasks.ProgressReporter) (map[string]any, error) {
		close(started)
		<-release
		return nil, nil
	})
	<-started

	// Active task cannot be deleted -> 409
	resp, err := api.DeleteTaskByID(t.Context(), DeleteTaskByIDRequestObject{TaskID: activeTask.ID})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if _, ok := resp.(DeleteTaskByID409Response); !ok {
		t.Errorf("expected 409 response for active task deletion, got %T", resp)
	}

	close(release)
	time.Sleep(50 * time.Millisecond)

	// Finished task can be deleted -> 204
	resp, err = api.DeleteTaskByID(t.Context(), DeleteTaskByIDRequestObject{TaskID: activeTask.ID})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if _, ok := resp.(DeleteTaskByID204Response); !ok {
		t.Errorf("expected 204 response, got %T", resp)
	}

	// Already deleted / not found -> 404
	resp, err = api.DeleteTaskByID(t.Context(), DeleteTaskByIDRequestObject{TaskID: activeTask.ID})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if _, ok := resp.(DeleteTaskByID404Response); !ok {
		t.Errorf("expected 404 response, got %T", resp)
	}
}
