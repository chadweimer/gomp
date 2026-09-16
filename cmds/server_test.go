package cmds

import (
	"testing"

	"github.com/chadweimer/gomp/config"
)

func TestServeApplicationCmd(t *testing.T) {
	got := serveApplicationCmd(config.Config{})
	if got == nil {
		t.Error("serveApplicationCmd() returned nil")
	}
}
