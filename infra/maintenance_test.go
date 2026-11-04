package infra

import (
	"testing"
)

func TestMaintenanceLock(t *testing.T) {
	lock := NewMaintenanceLock()

	if lock.IsActive() {
		t.Fatalf("expected lock to be inactive initially")
	}

	unlock, err := lock.TryAcquire()
	if err != nil {
		t.Fatalf("expected successful acquire, got error: %v", err)
	}
	if !lock.IsActive() {
		t.Fatalf("expected lock to be active after acquire")
	}

	// Secondary acquire should fail
	_, err = lock.TryAcquire()
	if err != ErrMaintenanceActive {
		t.Fatalf("expected ErrMaintenanceActive, got: %v", err)
	}

	// Unlock
	unlock()
	if lock.IsActive() {
		t.Fatalf("expected lock to be inactive after unlock")
	}

	// Idempotent unlock call
	unlock()
	if lock.IsActive() {
		t.Fatalf("expected lock to remain inactive after second unlock")
	}

	// Acquire again should succeed
	unlock2, err := lock.TryAcquire()
	if err != nil {
		t.Fatalf("expected re-acquire to succeed, got error: %v", err)
	}
	unlock2()
}
