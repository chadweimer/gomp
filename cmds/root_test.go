package cmds

import (
	"testing"

	"github.com/chadweimer/gomp/config"
)

func TestRootCmd(t *testing.T) {
	got := RootCmd(config.Config{})
	if got == nil {
		t.Error("RootCmd() returned nil")
	}
}
