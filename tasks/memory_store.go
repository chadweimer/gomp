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
		return ErrConflict
	}

	cloned := cloneTask(*task)
	s.tasks[task.ID] = cloned
	// Insert newest at beginning
	s.order = append([]uuid.UUID{task.ID}, s.order...)
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
	delete(s.tasks, id)
	s.order = slices.DeleteFunc(s.order, func(u uuid.UUID) bool {
		return u == id
	})
	return nil
}

func (s *memoryStore) List(_ context.Context, filter TaskFilter) ([]models.Task, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	result := make([]models.Task, 0, len(s.order))
	for _, id := range s.order {
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

	now := time.Now()
	prunedCount := 0

	// 1. Prune by age for terminal states
	toDelete := make([]uuid.UUID, 0)
	for _, id := range s.order {
		task := s.tasks[id]
		if isTerminal(task.State) {
			endTime := task.CreatedAt
			if task.CompletedAt != nil {
				endTime = *task.CompletedAt
			}
			if maxAge > 0 && now.Sub(endTime) > maxAge {
				toDelete = append(toDelete, id)
			}
		}
	}

	for _, id := range toDelete {
		delete(s.tasks, id)
		prunedCount++
	}

	s.order = slices.DeleteFunc(s.order, func(u uuid.UUID) bool {
		return slices.Contains(toDelete, u)
	})

	// 2. Prune by capacity (oldest finished tasks first) if still exceeding maxCapacity
	if maxCapacity > 0 && len(s.order) > maxCapacity {
		excess := len(s.order) - maxCapacity
		capacityPruned := make([]uuid.UUID, 0, excess)

		// Iterate backwards (from oldest to newest)
		for i := len(s.order) - 1; i >= 0 && len(capacityPruned) < excess; i-- {
			id := s.order[i]
			task := s.tasks[id]
			if isTerminal(task.State) {
				capacityPruned = append(capacityPruned, id)
			}
		}

		for _, id := range capacityPruned {
			delete(s.tasks, id)
			prunedCount++
		}

		s.order = slices.DeleteFunc(s.order, func(u uuid.UUID) bool {
			return slices.Contains(capacityPruned, u)
		})
	}

	return prunedCount, nil
}

func isTerminal(state models.TaskState) bool {
	return state == models.Completed || state == models.Failed || state == models.Cancelled
}

func cloneTask(src models.Task) models.Task {
	dst := src
	if src.Stage != nil {
		dst.Stage = lo.ToPtr(*src.Stage)
	}
	if src.Progress != nil {
		dst.Progress = lo.ToPtr(*src.Progress)
	}
	if src.Error != nil {
		dst.Error = lo.ToPtr(*src.Error)
	}
	if src.StartedAt != nil {
		dst.StartedAt = lo.ToPtr(*src.StartedAt)
	}
	if src.CompletedAt != nil {
		dst.CompletedAt = lo.ToPtr(*src.CompletedAt)
	}
	if src.Result != nil {
		dst.Result = lo.ToPtr(maps.Clone(*src.Result))
	}
	return dst
}
