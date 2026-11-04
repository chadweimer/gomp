package infra

import (
	"errors"
	"sync"
)

var (
	// ErrMaintenanceActive is returned when attempting to acquire the maintenance lock while it is already active.
	ErrMaintenanceActive = errors.New("maintenance mode is already active")
)

// MaintenanceLock coordinates app-wide maintenance mode.
type MaintenanceLock struct {
	mu     sync.Mutex
	active bool
}

// NewMaintenanceLock creates a new MaintenanceLock.
func NewMaintenanceLock() *MaintenanceLock {
	return &MaintenanceLock{}
}

// IsActive returns whether maintenance mode is currently active.
func (l *MaintenanceLock) IsActive() bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	return l.active
}

// TryAcquire attempts to enter maintenance mode. If successful, it returns an unlock function.
// If maintenance mode is already active, it returns ErrMaintenanceActive.
func (l *MaintenanceLock) TryAcquire() (func(), error) {
	l.mu.Lock()
	defer l.mu.Unlock()

	if l.active {
		return nil, ErrMaintenanceActive
	}

	l.active = true
	var once sync.Once
	unlock := func() {
		once.Do(func() {
			l.mu.Lock()
			defer l.mu.Unlock()
			l.active = false
		})
	}
	return unlock, nil
}
