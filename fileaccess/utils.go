package fileaccess

import (
	"errors"
	"io"
)

type unbufferedReaderAt struct {
	io.Reader

	offset int64
}

func ensureReaderAt(reader io.Reader) io.ReaderAt {
	readerAt, ok := reader.(io.ReaderAt)
	if !ok {
		// We have to create an adapter and potentially buffer the entire file in memory.
		// This is not ideal, but it should be rare since most file systems support io.ReaderAt.
		readerAt = &unbufferedReaderAt{reader, 0}
	}
	return readerAt
}

func (u *unbufferedReaderAt) ReadAt(p []byte, off int64) (int, error) {
	if off < u.offset {
		return 0, errors.New("invalid offset")
	}

	bytesWritten, err := io.CopyN(io.Discard, u.Reader, off-u.offset)
	u.offset += bytesWritten
	if err != nil {
		return 0, err
	}

	bytesRead, err := u.Reader.Read(p)
	u.offset += int64(bytesRead)
	return bytesRead, err
}
