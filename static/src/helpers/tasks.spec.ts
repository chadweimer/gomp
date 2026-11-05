import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import createFetchMock from 'vitest-fetch-mock';
import { pollTask } from './tasks';
import { Task, TaskState } from './schema.gen';

const fetchMocker = createFetchMock(vi);
const originalFetch = globalThis.fetch;

describe('tasks helper', () => {
  beforeEach(() => {
    fetchMocker.enableMocks();
    fetchMocker.resetMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    fetchMocker.resetMocks();
    vi.restoreAllMocks();
  });

  describe('pollTask', () => {
    it('resolves when task completes', async () => {
      const mockTask: Task = {
        id: 'task-1',
        type: 'backup',
        state: TaskState.completed,
        createdAt: new Date().toISOString(),
      };

      fetchMocker.mockResponse(JSON.stringify(mockTask));

      const task = await pollTask('task-1', { intervalMs: 10 });
      expect(task).not.toBeNull();
      expect(task?.state).toBe(TaskState.completed);
      expect(task?.id).toBe('task-1');
    });

    it('polls multiple times until terminal state', async () => {
      let callCount = 0;
      fetchMocker.mockResponse((req: Request) => {
        if (req.url.includes('/tasks/task-1')) {
          callCount++;
          if (callCount < 3) {
            return {
              status: 200,
              body: JSON.stringify({
                id: 'task-1',
                type: 'backup',
                state: TaskState.running,
                progress: callCount * 30,
                stage: 'Working',
                createdAt: new Date().toISOString()
              })
            };
          }
          return {
            status: 200,
            body: JSON.stringify({
              id: 'task-1',
              type: 'backup',
              state: TaskState.completed,
              progress: 100,
              createdAt: new Date().toISOString()
            })
          };
        }
        return { status: 404, body: '' };
      });

      const updates: number[] = [];
      const task = await pollTask('task-1', {
        intervalMs: 10,
        onUpdate: (t) => {
          if (t.progress != null) {
            updates.push(t.progress);
          }
        }
      });

      expect(callCount).toBe(3);
      expect(updates).toEqual([30, 60, 100]);
      expect(task).not.toBeNull();
      expect(task?.state).toBe(TaskState.completed);
    });

    it('resolves with task when task fails', async () => {
      const mockTask: Task = {
        id: 'task-1',
        type: 'backup',
        state: TaskState.failed,
        error: 'Out of disk space',
        createdAt: new Date().toISOString(),
      };

      fetchMocker.mockResponse(JSON.stringify(mockTask));

      const task = await pollTask('task-1', { intervalMs: 10 });
      expect(task).not.toBeNull();
      expect(task?.state).toBe(TaskState.failed);
      expect(task?.error).toBe('Out of disk space');
    });

    it('throws error when server returns error response', async () => {
      fetchMocker.mockResponse('Internal Server Error', { status: 500 });

      await expect(pollTask('task-1', { intervalMs: 10 }))
        .rejects.toThrow('Failed to query task status.');
    });

    it('resolves to null when aborted by signal', async () => {
      fetchMocker.mockResponse(JSON.stringify({
        id: 'task-1',
        type: 'backup',
        state: TaskState.running,
        createdAt: new Date().toISOString()
      }));

      const controller = new AbortController();
      setTimeout(() => controller.abort(), 25);

      const result = await pollTask('task-1', { intervalMs: 10, signal: controller.signal });
      expect(result).toBeNull();
    });
  });
});
