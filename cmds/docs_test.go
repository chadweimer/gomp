package cmds

import (
	"testing"

	"github.com/chadweimer/gomp/config"
)

func TestDocsCmd(t *testing.T) {
	got := docsCmd(config.Config{})
	if got == nil {
		t.Error("docsCmd() returned nil")
	}
}
