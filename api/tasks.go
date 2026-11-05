package api

import (
	"context"
	"errors"

	"github.com/chadweimer/gomp/infra"
	"github.com/chadweimer/gomp/tasks"
)

func (h apiHandler) ListTasks(ctx context.Context, request ListTasksRequestObject) (ListTasksResponseObject, error) {
	logger := infra.GetLoggerFromContext(ctx)

	filter := tasks.TaskFilter{}
	if request.Params.States != nil {
		filter.States = *request.Params.States
	}
	if request.Params.Types != nil {
		filter.Types = *request.Params.Types
	}

	taskList, err := h.taskManager.List(ctx, filter)
	if err != nil {
		logger.ErrorContext(ctx, "Failed to list tasks", "error", err)
		return ListTasks500Response{}, nil
	}

	return ListTasks200JSONResponse(taskList), nil
}

func (h apiHandler) GetTaskByID(ctx context.Context, request GetTaskByIDRequestObject) (GetTaskByIDResponseObject, error) {
	logger := infra.GetLoggerFromContext(ctx)

	task, err := h.taskManager.Get(ctx, request.TaskID)
	if err != nil {
		if errors.Is(err, tasks.ErrNotFound) {
			return GetTaskByID404Response{}, nil
		}
		logger.ErrorContext(ctx, "Failed to get task by id", "error", err, "taskId", request.TaskID)
		return GetTaskByID500Response{}, nil
	}

	return GetTaskByID200JSONResponse(*task), nil
}
