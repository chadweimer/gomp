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

func TestGetTasks(t *testing.T) {
	store := tasks.NewMemoryStore()
	manager := tasks.NewManager(store)
	defer manager.Close()

	api := apiHandler{
		tokenHandler: infra.NewTokenHandler([]string{"secure-key"}),
		taskManager:  manager,
	}

	// Create test tasks sequentially (since maintenance tasks are mutually exclusive)
	t1, err := manager.Submit(models.TaskTypeBackup, true, func(_ context.Context, _ tasks.ProgressReporter) (map[string]any, error) {
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

	t2, err := manager.Submit(models.TaskTypeRestore, false, func(_ context.Context, _ tasks.ProgressReporter) (map[string]any, error) {
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
	resp, err := api.GetTasks(t.Context(), GetTasksRequestObject{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	taskList, ok := resp.(GetTasks200JSONResponse)
	if !ok || len(taskList) < 2 {
		t.Fatalf("expected at least 2 tasks, got %v", resp)
	}

	// Filter by state
	completedState := []models.TaskState{models.Completed}
	resp, err = api.GetTasks(t.Context(), GetTasksRequestObject{
		Params: GetTasksParams{States: &completedState},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	taskList, ok = resp.(GetTasks200JSONResponse)
	if !ok {
		t.Fatalf("expected 200 response, got %T", resp)
	}
	for _, task := range taskList {
		if task.State != models.Completed {
			t.Errorf("expected Completed state, got %v", task.State)
		}
	}

	// Filter by type
	bType := models.TaskTypeBackup
	resp, err = api.GetTasks(t.Context(), GetTasksRequestObject{
		Params: GetTasksParams{Type: &bType},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	taskList, ok = resp.(GetTasks200JSONResponse)
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

	task, _ := manager.Submit(models.TaskTypeBackup, true, func(_ context.Context, _ tasks.ProgressReporter) (map[string]any, error) {
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

func TestUpdateTaskStateByID(t *testing.T) {
	store := tasks.NewMemoryStore()
	manager := tasks.NewManager(store)
	defer manager.Close()

	api := apiHandler{
		tokenHandler: infra.NewTokenHandler([]string{"secure-key"}),
		taskManager:  manager,
	}

	started := make(chan struct{})
	release := make(chan struct{})

	cancellableTask, _ := manager.Submit(models.TaskTypeBackup, true, func(ctx context.Context, _ tasks.ProgressReporter) (map[string]any, error) {
		close(started)
		<-ctx.Done()
		return nil, ctx.Err()
	})

	<-started

	// Cancel success
	cancelledState := models.Cancelled
	resp, err := api.UpdateTaskStateByID(t.Context(), UpdateTaskStateByIDRequestObject{
		TaskID: cancellableTask.ID,
		Body:   &UpdateTaskStateByIDJSONRequestBody{State: cancelledState},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	updatedResp, ok := resp.(UpdateTaskStateByID200JSONResponse)
	if !ok || updatedResp.State != models.Cancelled {
		t.Fatalf("expected 200 Cancelled response, got %T", resp)
	}

	// Already finished -> 409
	resp, err = api.UpdateTaskStateByID(t.Context(), UpdateTaskStateByIDRequestObject{
		TaskID: cancellableTask.ID,
		Body:   &UpdateTaskStateByIDJSONRequestBody{State: cancelledState},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if _, ok := resp.(UpdateTaskStateByID409Response); !ok {
		t.Errorf("expected 409 response for finished task, got %T", resp)
	}

	// Non-cancellable task
	startedRestore := make(chan struct{})
	nonCancellableTask, _ := manager.Submit(models.TaskTypeRestore, false, func(_ context.Context, _ tasks.ProgressReporter) (map[string]any, error) {
		close(startedRestore)
		<-release
		return nil, nil
	})
	<-startedRestore

	resp, err = api.UpdateTaskStateByID(t.Context(), UpdateTaskStateByIDRequestObject{
		TaskID: nonCancellableTask.ID,
		Body:   &UpdateTaskStateByIDJSONRequestBody{State: cancelledState},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if _, ok := resp.(UpdateTaskStateByID409Response); !ok {
		t.Errorf("expected 409 response for non-cancellable task, got %T", resp)
	}

	close(release)

	// Invalid state in body -> 400
	resp, err = api.UpdateTaskStateByID(t.Context(), UpdateTaskStateByIDRequestObject{
		TaskID: cancellableTask.ID,
		Body:   &UpdateTaskStateByIDJSONRequestBody{State: "invalid_state"},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if _, ok := resp.(UpdateTaskStateByID400Response); !ok {
		t.Errorf("expected 400 response for invalid state, got %T", resp)
	}

	// Not found -> 404
	resp, err = api.UpdateTaskStateByID(t.Context(), UpdateTaskStateByIDRequestObject{
		TaskID: uuid.New(),
		Body:   &UpdateTaskStateByIDJSONRequestBody{State: cancelledState},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if _, ok := resp.(UpdateTaskStateByID404Response); !ok {
		t.Errorf("expected 404 response for unknown task, got %T", resp)
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

	activeTask, _ := manager.Submit(models.TaskTypeBackup, true, func(_ context.Context, _ tasks.ProgressReporter) (map[string]any, error) {
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
