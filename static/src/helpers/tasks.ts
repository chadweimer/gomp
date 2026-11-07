import { api } from './api';
import { Task, TaskState } from './schema.gen';

export interface PollTaskOptions {
  intervalMs?: number;
  onUpdate?: (task: Task) => void;
  signal?: AbortSignal;
}

function isAborted(signal?: AbortSignal): boolean {
  return signal?.aborted === true;
}

/**
 * Polls a background task until it reaches a terminal state (completed or failed).
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

    if (data.state === TaskState.completed || data.state === TaskState.failed) {
      return data;
    }

    await delay(interval, options?.signal);
  }

  return null;
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
