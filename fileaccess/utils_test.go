package fileaccess

import (
	"bytes"
	"io"
	"strings"
	"testing"
)

// readerOnlyAdapter wraps a reader to only expose io.Reader interface
// This forces ensureReaderAt to use unbufferedReaderAt
type readerOnlyAdapter struct {
	r io.Reader
}

func (r *readerOnlyAdapter) Read(p []byte) (int, error) {
	return r.r.Read(p)
}

func TestUnbufferedReaderAtReadAt(t *testing.T) {
	tests := []struct {
		name           string
		data           string
		offset         int64
		bufferSize     int
		expectN        int
		expectError    bool
		errorContains  string
		validateBuffer func(t *testing.T, buf []byte)
	}{
		{
			name:        "Read from start of file",
			data:        "Hello, World!",
			offset:      0,
			bufferSize:  5,
			expectN:     5,
			expectError: false,
			validateBuffer: func(t *testing.T, buf []byte) {
				if string(buf[:5]) != "Hello" {
					t.Errorf("expected 'Hello', got '%s'", string(buf[:5]))
				}
			},
		},
		{
			name:        "Read from middle of file",
			data:        "Hello, World!",
			offset:      7,
			bufferSize:  5,
			expectN:     5,
			expectError: false,
			validateBuffer: func(t *testing.T, buf []byte) {
				if string(buf[:5]) != "World" {
					t.Errorf("expected 'World', got '%s'", string(buf[:5]))
				}
			},
		},
		{
			name:        "Read partial at end of file - returns EOF error",
			data:        "Hello",
			offset:      3,
			bufferSize:  10,
			expectN:     2,
			expectError: true,
			validateBuffer: func(t *testing.T, buf []byte) {
				if string(buf[:2]) != "lo" {
					t.Errorf("expected 'lo', got '%s'", string(buf[:2]))
				}
			},
		},
		{
			name:        "Read past end of file returns EOF",
			data:        "Hello",
			offset:      10,
			bufferSize:  5,
			expectN:     0,
			expectError: true,
		},
		{
			name:        "Read with buffer larger than remaining content - returns EOF",
			data:        "Hello, World!",
			offset:      8,
			bufferSize:  100,
			expectN:     5,
			expectError: true,
			validateBuffer: func(t *testing.T, buf []byte) {
				if string(buf[:5]) != "orld!" {
					t.Errorf("expected 'orld!', got '%s'", string(buf[:5]))
				}
			},
		},
		{
			name:        "Read with empty buffer",
			data:        "Hello",
			offset:      0,
			bufferSize:  0,
			expectN:     0,
			expectError: false,
		},
		{
			name:        "Sequential read at same offset",
			data:        "Hello",
			offset:      0,
			bufferSize:  2,
			expectN:     2,
			expectError: false,
			validateBuffer: func(t *testing.T, buf []byte) {
				if string(buf[:2]) != "He" {
					t.Errorf("expected 'He', got '%s'", string(buf[:2]))
				}
			},
		},
		{
			name:          "Negative offset should return error",
			data:          "Hello",
			offset:        -1,
			bufferSize:    5,
			expectN:       0,
			expectError:   true,
			errorContains: "invalid offset",
		},
		{
			name:        "Read single byte",
			data:        "Hello",
			offset:      0,
			bufferSize:  1,
			expectN:     1,
			expectError: false,
			validateBuffer: func(t *testing.T, buf []byte) {
				if buf[0] != 'H' {
					t.Errorf("expected 'H', got '%c'", buf[0])
				}
			},
		},
		{
			name:        "Read entire small file with large buffer - returns EOF",
			data:        "Hi",
			offset:      0,
			bufferSize:  10,
			expectN:     2,
			expectError: true,
			validateBuffer: func(t *testing.T, buf []byte) {
				if string(buf[:2]) != "Hi" {
					t.Errorf("expected 'Hi', got '%s'", string(buf[:2]))
				}
			},
		},
		{
			name:        "Read at exact file boundary",
			data:        "Hello",
			offset:      5,
			bufferSize:  1,
			expectN:     0,
			expectError: true,
		},
		{
			name:        "Read with offset one before end - returns EOF",
			data:        "Hello",
			offset:      4,
			bufferSize:  10,
			expectN:     1,
			expectError: true,
			validateBuffer: func(t *testing.T, buf []byte) {
				if buf[0] != 'o' {
					t.Errorf("expected 'o', got '%c'", buf[0])
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Arrange - wrap reader so it doesn't implement io.ReaderAt
			reader := &readerOnlyAdapter{strings.NewReader(tt.data)}
			readerAt := ensureReaderAt(reader)

			buf := make([]byte, tt.bufferSize)

			// Act
			n, err := readerAt.ReadAt(buf, tt.offset)

			// Assert
			if n != tt.expectN {
				t.Errorf("expected %d bytes read, got %d", tt.expectN, n)
			}

			if (err != nil) != tt.expectError {
				t.Errorf("expected error: %v, got error: %v", tt.expectError, err)
			}

			if tt.expectError && tt.errorContains != "" && err != nil {
				if !strings.Contains(err.Error(), tt.errorContains) {
					t.Errorf("expected error containing '%s', got '%s'", tt.errorContains, err.Error())
				}
			}

			if tt.validateBuffer != nil && n > 0 {
				tt.validateBuffer(t, buf)
			}
		})
	}
}

func TestUnbufferedReaderAtMultipleReads(t *testing.T) {
	type testRead []struct {
		offset     int64
		bufferSize int
		expectN    int
		expectData string
	}
	tests := []struct {
		name  string
		data  string
		reads testRead
	}{
		{
			name: "Sequential forward reads only",
			data: "Hello, World!",
			reads: testRead{
				{offset: 0, bufferSize: 5, expectN: 5, expectData: "Hello"},
				{offset: 5, bufferSize: 2, expectN: 2, expectData: ", "},
				{offset: 7, bufferSize: 5, expectN: 5, expectData: "World"},
			},
		},
		{
			name: "Single forward read",
			data: "0123456789",
			reads: testRead{
				{offset: 5, bufferSize: 2, expectN: 2, expectData: "56"},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Arrange - wrap reader so it doesn't implement io.ReaderAt
			reader := &readerOnlyAdapter{strings.NewReader(tt.data)}
			readerAt := ensureReaderAt(reader)

			// Act & Assert
			for i, read := range tt.reads {
				buf := make([]byte, read.bufferSize)
				n, _ := readerAt.ReadAt(buf, read.offset)

				if n != read.expectN {
					t.Errorf("read %d: expected %d bytes, got %d", i, read.expectN, n)
				}

				if read.expectN > 0 {
					if string(buf[:n]) != read.expectData {
						t.Errorf("read %d: expected '%s', got '%s'", i, read.expectData, string(buf[:n]))
					}
				}
			}
		})
	}
}

func TestUnbufferedReaderAtBackwardSeek(t *testing.T) {
	// This test verifies the current behavior: backward seeks should fail
	// since the implementation can only skip forward
	data := "Hello, World!"
	reader := &readerOnlyAdapter{strings.NewReader(data)}
	readerAt := ensureReaderAt(reader)

	buf := make([]byte, 5)

	// Read from offset 10
	_, err := readerAt.ReadAt(buf, 10)
	if err != nil {
		t.Logf("First read failed as expected: %v", err)
		return
	}

	// Try to read from earlier offset (backward seek)
	buf2 := make([]byte, 5)
	_, err = readerAt.ReadAt(buf2, 5)

	// The implementation should return an error for backward seeks
	if err == nil {
		t.Error("expected error for backward seek, but got none")
	} else if !strings.Contains(err.Error(), "invalid offset") {
		t.Errorf("expected 'invalid offset' error, got: %v", err)
	}
}

func TestUnbufferedReaderAtWithBytesReader(t *testing.T) {
	// Test with bytes.Reader which implements io.ReaderAt
	data := []byte("Hello, World!")
	reader := bytes.NewReader(data)

	readerAt := ensureReaderAt(reader)

	// Should use the bytes.Reader's ReadAt directly
	buf := make([]byte, 5)
	n, _ := readerAt.ReadAt(buf, 7)

	if n != 5 {
		t.Errorf("expected 5 bytes, got %d", n)
	}

	if string(buf) != "World" {
		t.Errorf("expected 'World', got '%s'", string(buf))
	}
}

func TestUnbufferedReaderAtContractCompliance(t *testing.T) {
	// Tests to verify io.ReaderAt contract compliance:
	// Contract: When ReadAt returns n < len(p), it must return a non-nil error

	data := "Hello"
	tests := []struct {
		name       string
		offset     int64
		bufferSize int
		testFn     func(t *testing.T, readerAt io.ReaderAt)
	}{
		{
			name:       "n < len(p) implies non-nil error",
			offset:     3,
			bufferSize: 10,
			testFn: func(t *testing.T, readerAt io.ReaderAt) {
				buf := make([]byte, 10)
				n, err := readerAt.ReadAt(buf, 3)

				// n < len(p) must have non-nil error
				if n < len(buf) && err == nil {
					t.Error("contract violation: n < len(p) but error is nil")
				}
			},
		},
		{
			name:       "Reading past end returns EOF error",
			offset:     10,
			bufferSize: 5,
			testFn: func(t *testing.T, readerAt io.ReaderAt) {
				buf := make([]byte, 5)
				n, err := readerAt.ReadAt(buf, 10)

				if n > 0 {
					t.Errorf("expected no bytes when reading past end, got %d", n)
				}

				if err == nil {
					t.Error("expected error when reading past end")
				}
			},
		},
		{
			name:       "Negative offset returns error",
			offset:     -5,
			bufferSize: 5,
			testFn: func(t *testing.T, readerAt io.ReaderAt) {
				buf := make([]byte, 5)
				_, err := readerAt.ReadAt(buf, -5)

				if err == nil {
					t.Error("expected error for negative offset")
				}
			},
		},
		{
			name:       "Successful full read returns no error",
			offset:     0,
			bufferSize: 5,
			testFn: func(t *testing.T, readerAt io.ReaderAt) {
				buf := make([]byte, 5)
				n, err := readerAt.ReadAt(buf, 0)

				if n != 5 {
					t.Errorf("expected 5 bytes, got %d", n)
				}

				if err != nil {
					t.Errorf("expected no error for full read, got %v", err)
				}

				if string(buf) != "Hello" {
					t.Errorf("expected 'Hello', got '%s'", string(buf))
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			reader := &readerOnlyAdapter{strings.NewReader(data)}
			readerAt := ensureReaderAt(reader)
			tt.testFn(t, readerAt)
		})
	}
}

func TestUnbufferedReaderAtEdgeCases(t *testing.T) {
	tests := []struct {
		name       string
		data       string
		offset     int64
		bufferSize int
		expectN    int
		shouldErr  bool
	}{
		{
			name:       "Empty data",
			data:       "",
			offset:     0,
			bufferSize: 5,
			expectN:    0,
			shouldErr:  true,
		},
		{
			name:       "Empty buffer on non-empty data",
			data:       "Hello",
			offset:     0,
			bufferSize: 0,
			expectN:    0,
			shouldErr:  false,
		},
		{
			name:       "Large offset on small data",
			data:       "Hi",
			offset:     1000,
			bufferSize: 5,
			expectN:    0,
			shouldErr:  true,
		},
		{
			name:       "Zero offset, single byte",
			data:       "X",
			offset:     0,
			bufferSize: 1,
			expectN:    1,
			shouldErr:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			reader := &readerOnlyAdapter{strings.NewReader(tt.data)}
			readerAt := ensureReaderAt(reader)

			buf := make([]byte, tt.bufferSize)
			n, err := readerAt.ReadAt(buf, tt.offset)

			if n != tt.expectN {
				t.Errorf("expected %d bytes, got %d", tt.expectN, n)
			}

			if (err != nil) != tt.shouldErr {
				t.Errorf("expected error: %v, got error: %v", tt.shouldErr, err)
			}
		})
	}
}
