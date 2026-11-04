import { api } from './api';
import { Task, TaskState } from './schema.gen';

export interface PollTaskOptions {
  intervalMs?: number;
  onUpdate?: (task: Task) => void;
  signal?: AbortSignal;
}

/**
 * Polls a background task until it reaches a terminal state (completed, failed, or cancelled).
 * Handles temporary HTTP 503 Maintenance Mode during restores gracefully with retries.
 */
function isAborted(signal?: AbortSignal): boolean {
  return signal?.aborted === true;
}

export async function pollTask(taskId: string, options?: PollTaskOptions): Promise<Task> {
  const interval = options?.intervalMs ?? 1500;

  while (!isAborted(options?.signal)) {
    try {
      const { data, response, error } = await api.client.GET('/tasks/{taskId}', {
        params: { path: { taskId } },
        signal: options?.signal
      });

      if (response.status === 503) {
        // System in maintenance mode during DB restore; wait and continue polling
        await delay(interval);
        continue;
      }

      if (error != null || data == null) {
        throw new Error('Failed to query task status.', { cause: error });
      }

      options?.onUpdate?.(data);

      if (data.state === TaskState.completed) {
        return data;
      }
      if (data.state === TaskState.failed) {
        const failureErr = new Error(data.error ?? 'Task failed.');
        (failureErr as { isTerminal?: boolean }).isTerminal = true;
        throw failureErr;
      }
      if (data.state === TaskState.cancelled) {
        const cancelErr = new Error('Task was cancelled.');
        (cancelErr as { isTerminal?: boolean }).isTerminal = true;
        throw cancelErr;
      }
    } catch (err: unknown) {
      if (isAborted(options?.signal)) {
        throw new Error('Task polling aborted.', { cause: err });
      }
      if (err instanceof Error && (err as { isTerminal?: boolean }).isTerminal === true) {
        throw err;
      }
      // For network blips or unexpected server errors, log and retry
      console.warn('Error polling task, retrying...', err);
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
      state: TaskState.cancelled
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
