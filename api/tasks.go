package api

import (
	"context"
	"errors"

	"github.com/chadweimer/gomp/infra"
	"github.com/chadweimer/gomp/tasks"
)

func (h apiHandler) GetTasks(ctx context.Context, request GetTasksRequestObject) (GetTasksResponseObject, error) {
	logger := infra.GetLoggerFromContext(ctx)

	if h.taskManager == nil {
		logger.ErrorContext(ctx, "Task manager is not configured")
		return GetTasks500Response{}, nil
	}

	filter := tasks.TaskFilter{}
	if request.Params.States != nil {
		filter.States = *request.Params.States
	}
	if request.Params.Type != nil {
		filter.Type = request.Params.Type
	}

	taskList, err := h.taskManager.List(ctx, filter)
	if err != nil {
		logger.ErrorContext(ctx, "Failed to list tasks", "error", err)
		return GetTasks500Response{}, nil
	}

	return GetTasks200JSONResponse(taskList), nil
}

func (h apiHandler) GetTaskByID(ctx context.Context, request GetTaskByIDRequestObject) (GetTaskByIDResponseObject, error) {
	logger := infra.GetLoggerFromContext(ctx)

	if h.taskManager == nil {
		logger.ErrorContext(ctx, "Task manager is not configured")
		return GetTaskByID500Response{}, nil
	}

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

func (h apiHandler) UpdateTaskStateByID(ctx context.Context, request UpdateTaskStateByIDRequestObject) (UpdateTaskStateByIDResponseObject, error) {
	logger := infra.GetLoggerFromContext(ctx)

	if h.taskManager == nil {
		logger.ErrorContext(ctx, "Task manager is not configured")
		return UpdateTaskStateByID500Response{}, nil
	}

	if request.Body == nil || !request.Body.State.Valid() {
		return UpdateTaskStateByID400Response{}, nil
	}

	task, err := h.taskManager.UpdateState(ctx, request.TaskID, request.Body.State)
	if err != nil {
		if errors.Is(err, tasks.ErrNotFound) {
			return UpdateTaskStateByID404Response{}, nil
		}
		if errors.Is(err, tasks.ErrNotCancellable) || errors.Is(err, tasks.ErrCannotCancelFinished) {
			logger.WarnContext(ctx, "Cannot cancel task", "error", err, "taskId", request.TaskID)
			return UpdateTaskStateByID409Response{}, nil
		}
		logger.ErrorContext(ctx, "Failed to update task state", "error", err, "taskId", request.TaskID)
		return UpdateTaskStateByID400Response{}, nil
	}

	return UpdateTaskStateByID200JSONResponse(*task), nil
}

func (h apiHandler) DeleteTaskByID(ctx context.Context, request DeleteTaskByIDRequestObject) (DeleteTaskByIDResponseObject, error) {
	logger := infra.GetLoggerFromContext(ctx)

	if h.taskManager == nil {
		logger.ErrorContext(ctx, "Task manager is not configured")
		return DeleteTaskByID500Response{}, nil
	}

	err := h.taskManager.Delete(ctx, request.TaskID)
	if err != nil {
		if errors.Is(err, tasks.ErrNotFound) {
			return DeleteTaskByID404Response{}, nil
		}
		if errors.Is(err, tasks.ErrCannotDeleteActive) {
			logger.WarnContext(ctx, "Cannot delete active task", "error", err, "taskId", request.TaskID)
			return DeleteTaskByID409Response{}, nil
		}
		logger.ErrorContext(ctx, "Failed to delete task", "error", err, "taskId", request.TaskID)
		return DeleteTaskByID500Response{}, nil
	}

	return DeleteTaskByID204Response{}, nil
}
