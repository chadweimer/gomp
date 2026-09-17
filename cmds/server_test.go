package cmds

import (
	"context"
	"errors"
	"io/fs"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"testing/fstest"
	"time"

	"github.com/chadweimer/gomp/config"
	"go.uber.org/mock/gomock"
)

type mockServer struct {
	addr             string
	listenAndServeFn func() error
	shutdownFn       func(ctx context.Context) error
	closeFn          func() error

	mu          sync.Mutex
	shutdownHit bool
	closeHit    bool
}

func (m *mockServer) ListenAndServe() error {
	if m.listenAndServeFn != nil {
		return m.listenAndServeFn()
	}
	return nil
}

func (m *mockServer) Shutdown(ctx context.Context) error {
	m.mu.Lock()
	m.shutdownHit = true
	m.mu.Unlock()
	if m.shutdownFn != nil {
		return m.shutdownFn(ctx)
	}
	return nil
}

func (m *mockServer) Close() error {
	m.mu.Lock()
	m.closeHit = true
	m.mu.Unlock()
	if m.closeFn != nil {
		return m.closeFn()
	}
	return nil
}

func TestServeApplicationCmd(t *testing.T) {
	got := serveApplicationCmd(config.Config{})
	if got == nil {
		t.Error("serveApplicationCmd() returned nil")
	}
}

func Test_createMux(t *testing.T) {
	tests := []struct {
		name        string
		secureKeys  []string
		assetsFS    fs.FS
		requestPath string
		wantCode    int
		wantContent string
	}{
		{
			name:       "index.html served for not found",
			secureKeys: []string{},
			assetsFS: fstest.MapFS{
				"index.html": &fstest.MapFile{
					Data:    []byte("<html><body>index</body></html>"),
					Mode:    0644,
					ModTime: time.Now(),
				},
			},
			requestPath: "/random/path",
			wantCode:    http.StatusOK,
			wantContent: "<html><body>index</body></html>",
		},
		{
			name:       "Static files served",
			secureKeys: []string{},
			assetsFS: fstest.MapFS{
				"file.txt": &fstest.MapFile{
					Data:    []byte("static content"),
					Mode:    0644,
					ModTime: time.Now(),
				},
			},
			requestPath: "/static/file.txt",
			wantCode:    http.StatusOK,
			wantContent: "static content",
		},
		{
			name:        "Uploads require auth",
			secureKeys:  []string{},
			assetsFS:    fstest.MapFS{},
			requestPath: "/uploads/file.jpg",
			wantCode:    http.StatusUnauthorized,
			wantContent: "",
		},
		{
			name:        "Backups require auth",
			secureKeys:  []string{},
			assetsFS:    fstest.MapFS{},
			requestPath: "/backups/file.zip",
			wantCode:    http.StatusUnauthorized,
			wantContent: "",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Arrange
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			dbDriver, _, uplDriver, uploader := getMocks(ctrl)
			dbDriver.EXPECT().Users().AnyTimes()
			req := httptest.NewRequest("GET", tt.requestPath, nil)
			resp := httptest.NewRecorder()

			// Act
			mux := createMux(tt.secureKeys, uploader, dbDriver, uplDriver, tt.assetsFS)
			mux.ServeHTTP(resp, req)

			// Assert
			if resp.Code != tt.wantCode {
				t.Errorf("expected status %d, got %d", tt.wantCode, resp.Code)
			}
			if resp.Body == nil {
				t.Fatal("expected non-nil body")
			}
			gotContent := resp.Body.String()
			if gotContent != tt.wantContent {
				t.Errorf("expected content '%s', got '%s'", tt.wantContent, gotContent)
			}
		})
	}
}

func TestListenAndServe(t *testing.T) {
	tests := []struct {
		name          string
		triggerStop   func(t *testing.T, cancel context.CancelFunc)
		mockSetup     func(started chan struct{}) *mockServer
		wantErr       bool
		checkShutdown bool
		checkClose    bool
	}{
		{
			name: "Graceful shutdown via context cancellation",
			triggerStop: func(_ *testing.T, cancel context.CancelFunc) {
				cancel()
			},
			mockSetup: func(started chan struct{}) *mockServer {
				return &mockServer{
					addr: ":8080",
					listenAndServeFn: func() error {
						close(started)
						return http.ErrServerClosed
					},
					shutdownFn: func(_ context.Context) error {
						return nil
					},
				}
			},
			wantErr:       false,
			checkShutdown: true,
			checkClose:    false,
		},
		{
			name: "Server startup error",
			triggerStop: func(_ *testing.T, cancel context.CancelFunc) {
				cancel()
			},
			mockSetup: func(started chan struct{}) *mockServer {
				return &mockServer{
					addr: ":8080",
					listenAndServeFn: func() error {
						close(started)
						return errors.New("bind: address already in use")
					},
					shutdownFn: func(_ context.Context) error {
						return nil
					},
				}
			},
			wantErr:       false,
			checkShutdown: true,
			checkClose:    false,
		},
		{
			name: "Forced close when shutdown fails",
			triggerStop: func(_ *testing.T, cancel context.CancelFunc) {
				cancel()
			},
			mockSetup: func(started chan struct{}) *mockServer {
				return &mockServer{
					addr: ":8080",
					listenAndServeFn: func() error {
						close(started)
						return http.ErrServerClosed
					},
					shutdownFn: func(_ context.Context) error {
						return errors.New("shutdown timeout")
					},
					closeFn: func() error {
						return nil
					},
				}
			},
			wantErr:       true,
			checkShutdown: true,
			checkClose:    true,
		},
		{
			name: "Forced close error is logged when shutdown fails",
			triggerStop: func(_ *testing.T, cancel context.CancelFunc) {
				cancel()
			},
			mockSetup: func(started chan struct{}) *mockServer {
				return &mockServer{
					addr: ":8080",
					listenAndServeFn: func() error {
						close(started)
						return http.ErrServerClosed
					},
					shutdownFn: func(_ context.Context) error {
						return errors.New("shutdown timeout")
					},
					closeFn: func() error {
						return errors.New("close failed")
					},
				}
			},
			wantErr:       true,
			checkShutdown: true,
			checkClose:    true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctx, cancel := context.WithCancel(context.Background())
			defer cancel()

			started := make(chan struct{})
			mock := tt.mockSetup(started)

			errChan := make(chan error, 1)
			go func() {
				errChan <- listenAndServe(ctx, mock)
			}()

			// Wait for server goroutine to start
			select {
			case <-started:
			case <-time.After(2 * time.Second):
				t.Fatal("timed out waiting for mock server to start")
			}

			tt.triggerStop(t, cancel)

			select {
			case err := <-errChan:
				if (err != nil) != tt.wantErr {
					t.Errorf("listenAndServe() error = %v, wantErr %v", err, tt.wantErr)
				}
			case <-time.After(2 * time.Second):
				t.Fatal("timed out waiting for listenAndServe to return")
			}

			mock.mu.Lock()
			defer mock.mu.Unlock()
			if tt.checkShutdown && !mock.shutdownHit {
				t.Error("expected Shutdown() to be called")
			}
			if tt.checkClose && !mock.closeHit {
				t.Error("expected Close() to be called")
			}
			if !tt.checkClose && mock.closeHit {
				t.Error("expected Close() NOT to be called")
			}
		})
	}
}
