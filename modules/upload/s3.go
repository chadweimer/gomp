package upload

import (
	"bytes"
	"io"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/aws/aws-sdk-go/aws/awserr"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
)

// S3Driver is an implementation of Driver that uses the Amazon S3.
type s3Driver struct {
	bucket string
}

// NewS3Driver constucts a S3Driver.
func newS3Driver(bucket string) s3Driver {
	return s3Driver{bucket: bucket}
}

// Save creates or overrites a file with the provided binary data.
func (u s3Driver) Save(filePath string, data []byte) error {
	svc := s3.New(session.New())

	key := filepath.ToSlash(filePath)
	contentType := http.DetectContentType(data)
	_, err := svc.PutObject(&s3.PutObjectInput{
		Body:        bytes.NewReader(data),
		ContentType: &contentType,
		Bucket:      &u.bucket,
		Key:         &key,
	})
	return err
}

// Delete deletes the file with the specified key, if it exists.
func (u s3Driver) Delete(key string) error {
	svc := s3.New(session.New())

	bucket := u.bucket
	key = filepath.ToSlash(key)

	_, err := svc.DeleteObject(&s3.DeleteObjectInput{
		Bucket: &bucket,
		Key:    &key,
	})
	return err
}

// DeleteAll deletes all files with the specified key prefix.
func (u s3Driver) DeleteAll(keyPrefix string) error {
	svc := s3.New(session.New())

	keyPrefix = filepath.ToSlash(keyPrefix)

	listOutput, err := svc.ListObjectsV2(&s3.ListObjectsV2Input{
		Bucket: &u.bucket,
		Prefix: &keyPrefix,
	})
	if err != nil {
		return err
	}
	for _, object := range listOutput.Contents {
		_, err := svc.DeleteObject(&s3.DeleteObjectInput{
			Bucket: &u.bucket,
			Key:    object.Key,
		})
		if err != nil {
			return err
		}
	}

	return nil
}

func (u s3Driver) Open(name string) (http.File, error) {
	// if the path is '/', move along because we'll just get bucket information
	if name == "/" {
		return nil, os.ErrNotExist
	}

	svc := s3.New(session.New())

	// Build the GetObject request, passing along conditional GET parameters
	getReq := s3.GetObjectInput{
		Bucket: &u.bucket,
		Key:    &name,
	}

	// Make the request and check the error
	getResp, err := svc.GetObject(&getReq)
	if err != nil {
		log.Print(err.Error())
		if reqerr, ok := err.(awserr.RequestFailure); ok {
			if reqerr.StatusCode() == http.StatusNotFound {
				// TODO: Log original error
				return nil, os.ErrNotExist
			}
		}
	}

	var readSeeker io.ReadSeeker
	// If we got content, read it, including associated headers
	if getResp.ContentLength != nil && *getResp.ContentLength > 0 {
		readSeeker = newLazyReadSeeker(getResp.Body, *getResp.ContentLength)
	} else {
		readSeeker = newLazyReadSeeker(getResp.Body, 0)
	}
	return s3File{key: name, obj: getResp, ReadSeeker: readSeeker}, nil
}

// LazyReadSeeker supports on-demand converting an io.Reader into an io.ReadSeeker.
// When up-converting, the original io.Reader is read in full into a copy.
type lazyReadSeeker struct {
	rawReader  io.Reader
	readSeeker io.ReadSeeker
	size       int64
	fakeEOF    bool
}

// newLazyReadSeeker constructs a new lazyReadSeeker using the specified io.Reader.
// As a performance optimization, seeking to the end can be supported
// without up-converting.
func newLazyReadSeeker(reader io.Reader, size int64) *lazyReadSeeker {
	return &lazyReadSeeker{rawReader: reader, size: size}
}

func (r *lazyReadSeeker) Read(p []byte) (n int, err error) {
	// If we already have a real ReadSeeker, use it
	if r.readSeeker != nil {
		return r.readSeeker.Read(p)
	}

	// We're faking a seek, because we don't have a read ReadSeeker.
	// Thus, if the client has seeked to the end, handle that case.
	if r.fakeEOF {
		return 0, io.EOF
	}

	n, err = r.rawReader.Read(p)

	// We need to special case if we didnt read everything.
	// Hitting this case can only happen once since we'll
	// upconvert and then hit the first if statement above
	// from that point forward
	amountRead := int64(n)
	if amountRead > 0 && amountRead < r.size {
		r.upconvert(p[0:n])
		r.Seek(amountRead, io.SeekStart)
	}

	return
}

func (r *lazyReadSeeker) Seek(offset int64, whence int) (int64, error) {
	// If we already have a real ReadSeeker, use it
	if r.readSeeker != nil {
		return r.readSeeker.Seek(offset, whence)
	}

	// Without making a copy, we only support seeking to the beginning or end
	if offset == 0 {
		switch whence {
		case io.SeekStart:
			r.fakeEOF = false
			return 0, nil
		case io.SeekEnd:
			r.fakeEOF = true
			return r.size - 1, nil
		}
	}

	// Unfortunately, it's now time to take the hit and up-convert,
	// so we must read the entire buffer and create a real ReadSeeker.
	r.upconvert(nil)
	return r.readSeeker.Seek(offset, whence)
}

func (r *lazyReadSeeker) upconvert(seed []byte) {
	buffer := bytes.NewBuffer(seed)
	remaining, err := ioutil.ReadAll(r.rawReader)
	if err != nil {
		// TODO: Is there a better solution than to panic?
		panic(err)
	}
	buffer.Write(remaining)
	r.readSeeker = bytes.NewReader(buffer.Bytes())
}

type s3File struct {
	io.ReadSeeker
	key string
	obj *s3.GetObjectOutput
}

func (f s3File) Close() error {
	if f.obj.Body != nil {
		return f.obj.Body.Close()
	}

	return nil
}

func (f s3File) Readdir(count int) ([]os.FileInfo, error) {
	return []os.FileInfo{}, nil
}

func (f s3File) Stat() (os.FileInfo, error) {
	return s3FileInfo{obj: f.obj, key: f.key}, nil
}

type s3FileInfo struct {
	key string
	obj *s3.GetObjectOutput
}

func (f s3FileInfo) Name() string {
	return f.key
}

func (f s3FileInfo) Size() int64 {
	if f.obj.ContentLength == nil {
		return 0
	}

	return *f.obj.ContentLength
}

func (f s3FileInfo) Mode() os.FileMode {
	return os.ModePerm
}

func (f s3FileInfo) ModTime() time.Time {
	return *f.obj.LastModified
}

func (f s3FileInfo) IsDir() bool {
	return false
}

func (f s3FileInfo) Sys() interface{} {
	return f.obj
}
