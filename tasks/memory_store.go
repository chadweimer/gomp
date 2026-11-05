package tasks

import (
	"context"
	"maps"
	"slices"
	"sync"
	"time"
	"uuid"

	"github.com/chadweimer/gomp/models"
	"github.com/samber/lo"
)

type memoryStore struct {
	mu    sync.RWMutex
	tasks map[uuid.UUID]models.Task
	order []uuid.UUID
}

// NewMemoryStore creates a thread-safe in-memory task store.
func NewMemoryStore() Store {
	return &memoryStore{
		tasks: make(map[uuid.UUID]models.Task),
		order: make([]uuid.UUID, 0),
	}
}

func (s *memoryStore) Create(_ context.Context, task *models.Task) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, exists := s.tasks[task.ID]; exists {
		return ErrTaskExists
	}

	s.tasks[task.ID] = cloneTask(*task)
	s.order = append(s.order, task.ID)
	return nil
}

func (s *memoryStore) Get(_ context.Context, id uuid.UUID) (*models.Task, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	task, exists := s.tasks[id]
	if !exists {
		return nil, ErrNotFound
	}
	cloned := cloneTask(task)
	return &cloned, nil
}

func (s *memoryStore) Update(_ context.Context, task *models.Task) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, exists := s.tasks[task.ID]; !exists {
		return ErrNotFound
	}
	s.tasks[task.ID] = cloneTask(*task)
	return nil
}

func (s *memoryStore) Delete(_ context.Context, id uuid.UUID) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, exists := s.tasks[id]; !exists {
		return ErrNotFound
	}
	s.deleteTasks([]uuid.UUID{id})
	return nil
}

func (s *memoryStore) List(_ context.Context, filter TaskFilter) ([]models.Task, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	result := make([]models.Task, 0, len(s.order))
	for _, id := range slices.Backward(s.order) {
		task, ok := s.tasks[id]
		if !ok {
			continue
		}

		if len(filter.States) > 0 && !slices.Contains(filter.States, task.State) {
			continue
		}
		if len(filter.Types) > 0 && !slices.Contains(filter.Types, task.Type) {
			continue
		}

		result = append(result, cloneTask(task))
	}
	return result, nil
}

func (s *memoryStore) Prune(_ context.Context, maxAge time.Duration, maxCapacity int) (int, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	prunedCount := s.pruneByAge(maxAge) + s.pruneByCapacity(maxCapacity)
	return prunedCount, nil
}

// pruneByAge deletes records of tasks that are terminal and older than maxAge
func (s *memoryStore) pruneByAge(maxAge time.Duration) int {
	now := time.Now()

	toDelete := lo.Filter(s.order, func(id uuid.UUID, _ int) bool {
		task := s.tasks[id]
		if isTerminal(task.State) {
			endTime := task.CreatedAt
			if task.CompletedAt != nil {
				endTime = *task.CompletedAt
			}
			if maxAge > 0 && now.Sub(endTime) > maxAge {
				return true
			}
		}
		return false
	})

	prunedCount := len(toDelete)
	s.deleteTasks(toDelete)

	return prunedCount
}

// pruneByCapacity deletes records of tasks that are terminal (oldest first)
// in order to get the store below the maxCapacity
func (s *memoryStore) pruneByCapacity(maxCapacity int) int {
	if maxCapacity <= 0 || len(s.order) <= maxCapacity {
		return 0
	}

	excess := len(s.order) - maxCapacity

	// Iterate from oldest to newest
	capacityPruned := lo.TakeFilter(s.order, excess, func(id uuid.UUID, _ int) bool {
		return isTerminal(s.tasks[id].State)
	})

	prunedCount := len(capacityPruned)
	s.deleteTasks(capacityPruned)

	return prunedCount
}

func (s *memoryStore) deleteTasks(toDelete []uuid.UUID) {
	for _, id := range toDelete {
		delete(s.tasks, id)
	}

	s.order = slices.DeleteFunc(s.order, func(u uuid.UUID) bool {
		return slices.Contains(toDelete, u)
	})
}

func isTerminal(state models.TaskState) bool {
	return state == models.Completed || state == models.Failed
}

func cloneTask(src models.Task) models.Task {
	dst := src
	if src.Stage != nil {
		dst.Stage = new(*src.Stage)
	}
	if src.Progress != nil {
		dst.Progress = new(*src.Progress)
	}
	if src.Error != nil {
		dst.Error = new(*src.Error)
	}
	if src.CompletedAt != nil {
		dst.CompletedAt = new(*src.CompletedAt)
	}
	if src.Result != nil {
		dst.Result = new(maps.Clone(*src.Result))
	}
	return dst
}
