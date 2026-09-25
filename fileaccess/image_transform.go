package fileaccess

import (
	"bytes"
	"image"
	"math"

	"github.com/bep/imagemeta"
	"golang.org/x/image/draw"
)

type pixelMapper func(srcX, srcY, srcWidth, srcHeight int) (dstX, dstY, dstWidth, dstHeight int)

func fit(src image.Rectangle, size int) (resize image.Rectangle) {
	srcW := src.Dx()
	srcH := src.Dy()

	// Compute the two possible scale factors.
	scaleW := float64(size) / float64(srcW)
	scaleH := float64(size) / float64(srcH)

	// Pick the *smaller* factor so the whole image stays visible.
	scale := math.Min(scaleW, scaleH)

	newW := int(math.Round(float64(srcW) * scale))
	newH := int(math.Round(float64(srcH) * scale))
	return image.Rect(0, 0, newW, newH)
}

func cover(src image.Rectangle, size int) (resize image.Rectangle, crop image.Rectangle) {
	srcW := src.Dx()
	srcH := src.Dy()

	// Compute the two possible scale factors.
	scaleW := float64(size) / float64(srcW)
	scaleH := float64(size) / float64(srcH)

	// Pick the *larger* factor so the image fills the box.
	scale := math.Max(scaleW, scaleH)

	newW := int(math.Round(float64(srcW) * scale))
	newH := int(math.Round(float64(srcH) * scale))

	// Offsets for a centred crop.
	offsetX := (newW - size) / 2
	offsetY := (newH - size) / 2

	resize = image.Rect(0, 0, newW, newH)
	crop = image.Rect(offsetX, offsetY, size+offsetX, size+offsetY)
	return resize, crop
}

func resizeImage(src image.Image, box image.Rectangle, scaler draw.Scaler) *image.RGBA {
	dst := image.NewRGBA(box)
	scaler.Scale(dst, dst.Bounds(), src, src.Bounds(), draw.Src, nil)
	return dst
}

// rotateImage reads EXIF orientation from the raw bytes and returns a corrected image
func rotateImage(raw []byte, format string, img image.Image) image.Image {
	var imageFormat imagemeta.ImageFormat
	switch format {
	case "jpeg":
		imageFormat = imagemeta.JPEG
	case "png":
		imageFormat = imagemeta.PNG
	case "tiff":
		imageFormat = imagemeta.TIFF
	case "webp":
		imageFormat = imagemeta.WebP
	default:
		// Unsupport format - return the original image unchanged
		return img
	}

	// Parse metadata to get EXIF orientation
	var orientation uint16
	_, err := imagemeta.Decode(imagemeta.Options{
		R:           bytes.NewReader(raw),
		ImageFormat: imageFormat,
		ShouldHandleTag: func(ti imagemeta.TagInfo) bool {
			return ti.Tag == "Orientation"
		},
		HandleTag: func(ti imagemeta.TagInfo) error {
			if ti.Tag == "Orientation" {
				if ot, ok := ti.Value.(uint16); ok {
					orientation = ot
				}
				return imagemeta.ErrStopWalking
			}
			return nil
		},
	})
	if err != nil {
		// No valid metadata - return original image unchanged
		return img
	}

	mapper := getOrientationMapper(orientation)
	if mapper == nil {
		return img
	}
	return applyTransform(img, mapper)
}

func getOrientationMapper(orientation uint16) pixelMapper {
	switch orientation {
	case 2:
		return flipHorizontal()
	case 3:
		return rotate180()
	case 4:
		return flipVertical()
	case 5:
		return compose(rotate90CCW(), flipHorizontal())
	case 6:
		return rotate90CCW()
	case 7:
		return compose(rotate90CW(), flipHorizontal())
	case 8:
		return rotate90CW()
	default:
		return nil
	}
}

func applyTransform(img image.Image, mapper pixelMapper) image.Image {
	bounds := img.Bounds()
	srcW, srcH := bounds.Dx(), bounds.Dy()

	// First pass: get destination dimensions
	_, _, dstW, dstH := mapper(0, 0, srcW, srcH)
	dst := image.NewRGBA(image.Rect(0, 0, dstW, dstH))

	// Second pass: copy pixels
	for y := range srcH {
		for x := range srcW {
			dstX, dstY, _, _ := mapper(x, y, srcW, srcH)
			dst.Set(dstX, dstY, img.At(x+bounds.Min.X, y+bounds.Min.Y))
		}
	}
	return dst
}

func flipHorizontal() pixelMapper {
	return func(srcX, srcY, srcW, srcH int) (int, int, int, int) {
		return srcW - 1 - srcX, srcY, srcW, srcH
	}
}

func flipVertical() pixelMapper {
	return func(srcX, srcY, srcW, srcH int) (int, int, int, int) {
		return srcX, srcH - 1 - srcY, srcW, srcH
	}
}

func rotate90CW() pixelMapper {
	return func(srcX, srcY, srcW, srcH int) (int, int, int, int) {
		return srcY, srcW - 1 - srcX, srcH, srcW
	}
}

func rotate90CCW() pixelMapper {
	return func(srcX, srcY, srcW, srcH int) (int, int, int, int) {
		return srcH - 1 - srcY, srcX, srcH, srcW
	}
}

func rotate180() pixelMapper {
	return func(srcX, srcY, srcW, srcH int) (int, int, int, int) {
		return srcW - 1 - srcX, srcH - 1 - srcY, srcW, srcH
	}
}

// Compose mappers for complex operations
func compose(a, b pixelMapper) pixelMapper {
	return func(srcX, srcY, srcW, srcH int) (int, int, int, int) {
		mx, my, mw, mh := a(srcX, srcY, srcW, srcH)
		return b(mx, my, mw, mh)
	}
}
