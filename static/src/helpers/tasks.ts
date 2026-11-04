import { api } from './api';
import { Task, TaskState, TaskStateUpdateState } from './schema.gen';

export interface PollTaskOptions {
  intervalMs?: number;
  onUpdate?: (task: Task) => void;
  signal?: AbortSignal;
}

function isAborted(signal?: AbortSignal): boolean {
  return signal?.aborted === true;
}

/**
 * Polls a background task until it reaches a terminal state (completed, failed, or cancelled).
 */
export async function pollTask(taskId: string, options?: PollTaskOptions): Promise<Task> {
  const interval = options?.intervalMs ?? 1500;

  while (!isAborted(options?.signal)) {
    const { data, error } = await api.client.GET('/tasks/{taskId}', {
      params: { path: { taskId } },
      signal: options?.signal
    });

    if (error != null || data == null) {
      throw new Error('Failed to query task status.', { cause: error });
    }

    options?.onUpdate?.(data);

    if (
      data.state === TaskState.completed ||
      data.state === TaskState.failed ||
      data.state === TaskState.cancelled
    ) {
      return data;
    }

    await delay(interval);
  }

  throw new Error('Task polling aborted.');
}

/**
 * Requests cancellation of an in-flight background task.
 */
export async function cancelTask(taskId: string): Promise<Task> {
  const { data, error } = await api.client.PUT('/tasks/{taskId}/state', {
    params: { path: { taskId } },
    body: {
      state: TaskStateUpdateState.cancelled
    }
  });

  if (error != null || data == null) {
    throw new Error('Failed to cancel task.', { cause: error });
  }

  return data;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
