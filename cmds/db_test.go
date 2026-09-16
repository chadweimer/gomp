package cmds

import (
	"testing"

	"github.com/chadweimer/gomp/config"
)

func TestDatabaseCmd(t *testing.T) {
	got := databaseCmd(config.Config{})
	if got == nil {
		t.Error("databaseCmd() returned nil")
	}
}
