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
 * Returns null if polling is aborted via the options.signal.
 */
export async function pollTask(taskId: string, options?: PollTaskOptions): Promise<Task | null> {
  const interval = options?.intervalMs ?? 1500;

  while (!isAborted(options?.signal)) {
    const { data, error } = await api.client.GET('/tasks/{taskId}', {
      params: { path: { taskId } },
      signal: options?.signal
    });

    if (isAborted(options?.signal)) {
      return null;
    }

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

    await delay(interval, options?.signal);
  }

  return null;
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

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (isAborted(signal)) {
      resolve();
      return;
    }
    const timeout = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timeout);
        resolve();
      },
      { once: true }
    );
  });
}
