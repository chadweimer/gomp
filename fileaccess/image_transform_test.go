package fileaccess

import (
	"encoding/binary"
	"image"
	"image/color"
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

func Test_applyTransform(t *testing.T) {
	red := color.RGBA{R: 255, A: 255}
	green := color.RGBA{G: 255, A: 255}
	blue := color.RGBA{B: 255, A: 255}
	white := color.RGBA{R: 255, G: 255, B: 255, A: 255}

	makeImage := func(rect image.Rectangle, pixels [][]color.Color) image.Image {
		img := image.NewRGBA(rect)
		for y, row := range pixels {
			for x, col := range row {
				img.Set(rect.Min.X+x, rect.Min.Y+y, col)
			}
		}
		return img
	}

	type testArgs struct {
		caseName string
		src      image.Image
		mapper   pixelMapper
		expected image.Image
	}

	tests := []testArgs{
		{
			caseName: "Identity",
			src: makeImage(image.Rect(0, 0, 2, 2), [][]color.Color{
				{red, green},
				{blue, white},
			}),
			mapper: func(x, y, w, h int) (int, int, int, int) {
				return x, y, w, h
			},
			expected: makeImage(image.Rect(0, 0, 2, 2), [][]color.Color{
				{red, green},
				{blue, white},
			}),
		},
		{
			caseName: "Flip Horizontal",
			src: makeImage(image.Rect(0, 0, 2, 2), [][]color.Color{
				{red, green},
				{blue, white},
			}),
			mapper: flipHorizontal(),
			expected: makeImage(image.Rect(0, 0, 2, 2), [][]color.Color{
				{green, red},
				{white, blue},
			}),
		},
		{
			caseName: "Flip Vertical",
			src: makeImage(image.Rect(0, 0, 2, 2), [][]color.Color{
				{red, green},
				{blue, white},
			}),
			mapper: flipVertical(),
			expected: makeImage(image.Rect(0, 0, 2, 2), [][]color.Color{
				{blue, white},
				{red, green},
			}),
		},
		{
			caseName: "Rotate 180",
			src: makeImage(image.Rect(0, 0, 2, 2), [][]color.Color{
				{red, green},
				{blue, white},
			}),
			mapper: rotate180(),
			expected: makeImage(image.Rect(0, 0, 2, 2), [][]color.Color{
				{white, blue},
				{green, red},
			}),
		},
		{
			caseName: "Rotate 90 CW (transposes dimensions)",
			src: makeImage(image.Rect(0, 0, 2, 3), [][]color.Color{
				{red, green},
				{blue, white},
				{green, red},
			}),
			mapper: rotate90CW(),
			expected: makeImage(image.Rect(0, 0, 3, 2), [][]color.Color{
				{green, white, red},
				{red, blue, green},
			}),
		},
		{
			caseName: "Non-zero bounds origin",
			src: makeImage(image.Rect(10, 20, 12, 22), [][]color.Color{
				{red, green},
				{blue, white},
			}),
			mapper: flipHorizontal(),
			expected: makeImage(image.Rect(0, 0, 2, 2), [][]color.Color{
				{green, red},
				{white, blue},
			}),
		},
	}

	for _, test := range tests {
		t.Run(test.caseName, func(t *testing.T) {
			actual := applyTransform(test.src, test.mapper)

			if actual.Bounds() != test.expected.Bounds() {
				t.Fatalf("bounds mismatch: got %v, want %v", actual.Bounds(), test.expected.Bounds())
			}

			bounds := actual.Bounds()
			for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
				for x := bounds.Min.X; x < bounds.Max.X; x++ {
					if actual.At(x, y) != test.expected.At(x, y) {
						t.Errorf("pixel at (%d, %d) mismatch: got %v, want %v", x, y, actual.At(x, y), test.expected.At(x, y))
					}
				}
			}
		})
	}
}

func Test_getOrientation(t *testing.T) {
	createExifTIFF := func(orientation uint16) []byte {
		buf := make([]byte, 0, 26)
		// TIFF header: Little-endian II, 42, offset 8 to IFD
		buf = append(buf, 'I', 'I', 42, 0, 8, 0, 0, 0)
		// 1 tag entry
		buf = binary.LittleEndian.AppendUint16(buf, 1)
		// Tag: Orientation = 0x0112, type = SHORT (3), count = 1, value = orientation
		buf = binary.LittleEndian.AppendUint16(buf, 0x0112)
		buf = binary.LittleEndian.AppendUint16(buf, 3)
		buf = binary.LittleEndian.AppendUint32(buf, 1)
		buf = binary.LittleEndian.AppendUint16(buf, orientation)
		buf = append(buf, 0, 0) // padding value to 4 bytes
		// Next IFD offset = 0
		buf = append(buf, 0, 0, 0, 0)
		return buf
	}

	createExifJPEG := func(orientation uint16) []byte {
		tiff := createExifTIFF(orientation)
		buf := make([]byte, 0, 4+6+len(tiff))
		buf = append(buf, 0xFF, 0xD8) // SOI
		buf = append(buf, 0xFF, 0xE1) // APP1 marker
		app1Len := uint16(2 + 6 + len(tiff))
		buf = binary.BigEndian.AppendUint16(buf, app1Len)
		buf = append(buf, 'E', 'x', 'i', 'f', 0, 0)
		buf = append(buf, tiff...)
		return buf
	}

	createExifPNG := func(orientation uint16) []byte {
		tiff := createExifTIFF(orientation)
		buf := make([]byte, 0, 8+4+4+len(tiff)+4)
		buf = append(buf, 0x89, 'P', 'N', 'G', '\r', '\n', 0x1a, '\n')
		buf = binary.BigEndian.AppendUint32(buf, uint32(len(tiff)))
		buf = append(buf, 'e', 'X', 'I', 'f')
		buf = append(buf, tiff...)
		buf = append(buf, 0, 0, 0, 0) // CRC
		return buf
	}

	createExifWebP := func(orientation uint16) []byte {
		tiff := createExifTIFF(orientation)
		buf := make([]byte, 0, 12+8+len(tiff))
		buf = append(buf, 'R', 'I', 'F', 'F')
		fileSize := uint32(4 + 8 + len(tiff))
		buf = binary.LittleEndian.AppendUint32(buf, fileSize)
		buf = append(buf, 'W', 'E', 'B', 'P')
		buf = append(buf, 'E', 'X', 'I', 'F')
		buf = binary.LittleEndian.AppendUint32(buf, uint32(len(tiff)))
		buf = append(buf, tiff...)
		return buf
	}

	type testArgs struct {
		caseName string
		raw      []byte
		format   string
		expected uint16
	}

	tests := []testArgs{
		{
			caseName: "Unsupported format - gif",
			raw:      []byte{0x47, 0x49, 0x46, 0x38, 0x39, 0x61},
			format:   "gif",
			expected: 1,
		},
		{
			caseName: "Unsupported format - bmp",
			raw:      []byte{'B', 'M'},
			format:   "bmp",
			expected: 1,
		},
		{
			caseName: "Empty raw bytes",
			raw:      nil,
			format:   "jpeg",
			expected: 0,
		},
		{
			caseName: "Corrupt bytes",
			raw:      []byte("invalid jpeg data"),
			format:   "jpeg",
			expected: 0,
		},
		{
			caseName: "JPEG with EXIF orientation 1",
			raw:      createExifJPEG(1),
			format:   "jpeg",
			expected: 1,
		},
		{
			caseName: "JPEG with EXIF orientation 2",
			raw:      createExifJPEG(2),
			format:   "jpeg",
			expected: 2,
		},
		{
			caseName: "JPEG with EXIF orientation 3",
			raw:      createExifJPEG(3),
			format:   "jpeg",
			expected: 3,
		},
		{
			caseName: "JPEG with EXIF orientation 4",
			raw:      createExifJPEG(4),
			format:   "jpeg",
			expected: 4,
		},
		{
			caseName: "JPEG with EXIF orientation 5",
			raw:      createExifJPEG(5),
			format:   "jpeg",
			expected: 5,
		},
		{
			caseName: "JPEG with EXIF orientation 6",
			raw:      createExifJPEG(6),
			format:   "jpeg",
			expected: 6,
		},
		{
			caseName: "JPEG with EXIF orientation 7",
			raw:      createExifJPEG(7),
			format:   "jpeg",
			expected: 7,
		},
		{
			caseName: "JPEG with EXIF orientation 8",
			raw:      createExifJPEG(8),
			format:   "jpeg",
			expected: 8,
		},
		{
			caseName: "TIFF with EXIF orientation 2",
			raw:      createExifTIFF(2),
			format:   "tiff",
			expected: 2,
		},
		{
			caseName: "TIFF with EXIF orientation 3",
			raw:      createExifTIFF(3),
			format:   "tiff",
			expected: 3,
		},
		{
			caseName: "PNG without EXIF",
			raw:      []byte{0x89, 'P', 'N', 'G', '\r', '\n', 0x1a, '\n'},
			format:   "png",
			expected: 0,
		},
		{
			caseName: "PNG with EXIF orientation 4",
			raw:      createExifPNG(4),
			format:   "png",
			expected: 4,
		},
		{
			caseName: "PNG with EXIF orientation 5",
			raw:      createExifPNG(5),
			format:   "png",
			expected: 5,
		},
		{
			caseName: "WebP without EXIF",
			raw:      []byte{'R', 'I', 'F', 'F', 4, 0, 0, 0, 'W', 'E', 'B', 'P'},
			format:   "webp",
			expected: 0,
		},
		{
			caseName: "WebP with EXIF orientation 6",
			raw:      createExifWebP(6),
			format:   "webp",
			expected: 6,
		},
		{
			caseName: "WebP with EXIF orientation 7",
			raw:      createExifWebP(7),
			format:   "webp",
			expected: 7,
		},
	}

	for _, test := range tests {
		t.Run(test.caseName, func(t *testing.T) {
			actual := getOrientation(test.raw, test.format)
			if actual != test.expected {
				t.Errorf("expected: %d, actual: %d", test.expected, actual)
			}
		})
	}
}
