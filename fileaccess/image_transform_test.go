package fileaccess

import (
	"image"
	"testing"
)

func Test_fit(t *testing.T) {
	type testArgs struct {
		caseName string
		src      image.Rectangle
		size     int
		expected image.Rectangle
	}

	// Arrange
	tests := []testArgs{
		{
			caseName: "400x200 to 100",
			src:      image.Rect(0, 0, 400, 200),
			size:     100,
			expected: image.Rect(0, 0, 100, 50),
		},
		{
			caseName: "200x400 to 100",
			src:      image.Rect(0, 0, 200, 400),
			size:     100,
			expected: image.Rect(0, 0, 50, 100),
		},
		{
			caseName: "75x50 to 100",
			src:      image.Rect(0, 0, 75, 50),
			size:     100,
			expected: image.Rect(0, 0, 100, 67),
		},
	}
	for _, test := range tests {
		t.Run(test.caseName, func(t *testing.T) {
			// Arrange
			actual := fit(test.src, test.size)
			if actual != test.expected {
				t.Errorf("expected: %s, actual: %s", test.expected, actual)
			}
		})
	}
}

func Test_cover(t *testing.T) {
	type testArgs struct {
		caseName       string
		src            image.Rectangle
		size           int
		expectedResize image.Rectangle
		expectedCrop   image.Rectangle
	}

	// Arrange
	tests := []testArgs{
		{
			caseName:       "400x200 to 100",
			src:            image.Rect(0, 0, 400, 200),
			size:           100,
			expectedResize: image.Rect(0, 0, 200, 100),
			expectedCrop:   image.Rect(50, 0, 150, 100),
		},
		{
			caseName:       "200x400 to 100",
			src:            image.Rect(0, 0, 200, 400),
			size:           100,
			expectedResize: image.Rect(0, 0, 100, 200),
			expectedCrop:   image.Rect(0, 50, 100, 150),
		},
		{
			caseName:       "75x50 to 100",
			src:            image.Rect(0, 0, 75, 50),
			size:           100,
			expectedResize: image.Rect(0, 0, 150, 100),
			expectedCrop:   image.Rect(25, 0, 125, 100),
		},
	}
	for _, test := range tests {
		t.Run(test.caseName, func(t *testing.T) {
			// Arrange
			actualResize, actualCrop := cover(test.src, test.size)
			if actualResize != test.expectedResize {
				t.Errorf("expected resize: %s, actual resize: %s", test.expectedResize, actualResize)
			}
			if actualCrop != test.expectedCrop {
				t.Errorf("expected crop: %s, actual crop: %s", test.expectedCrop, actualCrop)
			}
		})
	}
}

func Test_pixelmappers(t *testing.T) {
	tests := []struct {
		name        string
		orientation uint16
		wantMapper  bool
		input       [][4]int
		want        [][4]int
	}{
		{
			name:        "unknown test",
			orientation: 0,
			wantMapper:  false,
		},
		{
			name:        "normal test",
			orientation: 1,
			wantMapper:  false,
		},
		{
			name:        "flipHorizontal test",
			orientation: 2,
			wantMapper:  true,
			input: [][4]int{
				{1, 2, 4, 4},
				{1, 3, 9, 6},
			},
			want: [][4]int{
				{2, 2, 4, 4},
				{7, 3, 9, 6},
			},
		},
		{
			name:        "rotate180 test",
			orientation: 3,
			wantMapper:  true,
			input: [][4]int{
				{1, 2, 4, 4},
				{1, 3, 9, 6},
			},
			want: [][4]int{
				{2, 1, 4, 4},
				{7, 2, 9, 6},
			},
		},
		{
			name:        "flipVertical test",
			orientation: 4,
			wantMapper:  true,
			input: [][4]int{
				{1, 2, 4, 4},
				{1, 3, 9, 6},
			},
			want: [][4]int{
				{1, 1, 4, 4},
				{1, 2, 9, 6},
			},
		},
		{
			name:        "rotate90CCW and flipHorizontal test",
			orientation: 5,
			wantMapper:  true,
			input: [][4]int{
				{1, 2, 4, 4},
				{1, 3, 9, 6},
			},
			want: [][4]int{
				{2, 1, 4, 4},
				{3, 1, 6, 9},
			},
		},
		{
			name:        "rotate90CCW test",
			orientation: 6,
			wantMapper:  true,
			input: [][4]int{
				{1, 2, 4, 4},
				{1, 3, 9, 6},
			},
			want: [][4]int{
				{1, 1, 4, 4},
				{2, 1, 6, 9},
			},
		},
		{
			name:        "rotate90CW and flipHorizontal test",
			orientation: 7,
			wantMapper:  true,
			input: [][4]int{
				{1, 2, 4, 4},
				{1, 3, 9, 6},
			},
			want: [][4]int{
				{1, 2, 4, 4},
				{2, 7, 6, 9},
			},
		},
		{
			name:        "rotate90CW test",
			orientation: 8,
			wantMapper:  true,
			input: [][4]int{
				{1, 2, 4, 4},
				{1, 3, 9, 6},
			},
			want: [][4]int{
				{2, 2, 4, 4},
				{3, 7, 6, 9},
			},
		},
		{
			name:        "unsupported test",
			orientation: 9,
			wantMapper:  false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			for i, in := range tt.input {
				mapper := getOrientationMapper(tt.orientation)
				if tt.wantMapper && mapper == nil {
					t.Errorf("%s() = nil mapper, want non-nil", tt.name)
					continue
				} else if !tt.wantMapper && mapper != nil {
					t.Errorf("%s() = non-nil mapper, want nil", tt.name)
					continue
				}
				gotX, gotY, gotW, gotH := mapper(in[0], in[1], in[2], in[3])
				want := tt.want[i]
				if gotX != want[0] || gotY != want[1] || gotW != want[2] || gotH != want[3] {
					t.Errorf("%s() = (%v, %v, %v, %v), want (%v, %v, %v, %v)", tt.name, gotX, gotY, gotW, gotH, want[0], want[1], want[2], want[3])
				}
			}
		})
	}
}
