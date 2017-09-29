package upload

import (
	"bytes"
	"io"
	"io/ioutil"
	"log"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go/aws/awserr"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
	"github.com/chadweimer/gomp/modules/conf"
	"github.com/julienschmidt/httprouter"
)

// S3Driver is an implementation of Driver that uses the Amazon S3.
type S3Driver struct {
	cfg *conf.Config
}

// NewS3Driver constucts a S3Driver.
func NewS3Driver(cfg *conf.Config) S3Driver {
	return S3Driver{cfg: cfg}
}

// Save creates or overrites a file with the provided binary data.
func (u S3Driver) Save(filePath string, data []byte) error {
	svc := s3.New(session.New())

	bucket := u.cfg.UploadPath
	key := filepath.ToSlash(filePath)
	contentType := http.DetectContentType(data)
	_, err := svc.PutObject(&s3.PutObjectInput{
		Body:        bytes.NewReader(data),
		ContentType: &contentType,
		Bucket:      &bucket,
		Key:         &key,
	})
	return err
}

// Delete deletes the file with the specified key, if it exists.
func (u S3Driver) Delete(key string) error {
	svc := s3.New(session.New())

	bucket := u.cfg.UploadPath
	key = filepath.ToSlash(key)

	_, err := svc.DeleteObject(&s3.DeleteObjectInput{
		Bucket: &bucket,
		Key:    &key,
	})
	return err
}

// DeleteAll deletes all files with the specified key prefix.
func (u S3Driver) DeleteAll(keyPrefix string) error {
	svc := s3.New(session.New())

	bucket := u.cfg.UploadPath
	keyPrefix = filepath.ToSlash(keyPrefix)

	listOutput, err := svc.ListObjectsV2(&s3.ListObjectsV2Input{
		Bucket: &bucket,
		Prefix: &keyPrefix,
	})
	if err != nil {
		return err
	}
	for _, object := range listOutput.Contents {
		_, err := svc.DeleteObject(&s3.DeleteObjectInput{
			Bucket: &bucket,
			Key:    object.Key,
		})
		if err != nil {
			return err
		}
	}

	return nil
}

// List retrieves information about all uploaded files with the specified key prefix.
func (u S3Driver) List(keyPrefix string) ([]FileInfo, error) {
	svc := s3.New(session.New())

	var fileInfos []FileInfo
	bucket := u.cfg.UploadPath
	prefix := filepath.ToSlash(filepath.Join(keyPrefix, "images"))

	listOutput, err := svc.ListObjectsV2(&s3.ListObjectsV2Input{
		Bucket: &bucket,
		Prefix: &prefix,
	})
	if err != nil {
		return fileInfos, err
	}

	for _, object := range listOutput.Contents {
		urlSegments := strings.Split(*object.Key, "/")
		name := urlSegments[len(urlSegments)-1]
		origURL := "/uploads/" + *object.Key

		thumbKey := strings.Replace(*object.Key, "/images/", "/thumbs/", 1)
		thumbURL := "/uploads/" + thumbKey

		fileInfo := FileInfo{
			Name:         name,
			URL:          origURL,
			ThumbnailURL: thumbURL,
		}
		fileInfos = append(fileInfos, fileInfo)
	}

	return fileInfos, nil
}

// HandleS3Uploads returns a handler that serves static files from Amazon S3.
// If the file does not exist on the S3, a 404 is returned.
func HandleS3Uploads(bucket string) httprouter.Handle {
	return func(resp http.ResponseWriter, req *http.Request, p httprouter.Params) {
		filePath := p.ByName("filepath")
		// if the path is '/', move along because we'll just get bucket information
		if filePath == "/" {
			http.NotFound(resp, req)
			return
		}

		svc := s3.New(session.New())

		// Build the GetObject request, passing along conditional GET parameters
		getReq := s3.GetObjectInput{
			Bucket: &bucket,
			Key:    &filePath,
		}
		passThroughReqHeaders(&getReq, req.Header)

		// Make the request and check the error
		getResp, err := svc.GetObject(&getReq)
		if getResp != nil && getResp.Body != nil {
			defer getResp.Body.Close()
		}
		if err != nil {
			log.Print(err.Error())
			if reqerr, ok := err.(awserr.RequestFailure); ok {
				if reqerr.StatusCode() == http.StatusNotFound {
					http.Error(resp, reqerr.Message(), http.StatusNotFound)
					return
				}
				if reqerr.StatusCode() != http.StatusNotModified {
					http.Error(resp, reqerr.Message(), http.StatusInternalServerError)
					return
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
		passThroughRespHeaders(getResp, resp.Header())

		// Serve up the file to the client
		http.ServeContent(resp, req, filePath, *getResp.LastModified, readSeeker)
	}
}

func passThroughReqHeaders(getReq *s3.GetObjectInput, reqHeader http.Header) {
	if ifModSince, err := time.Parse(http.TimeFormat, reqHeader.Get("If-Modified-Since")); err == nil {
		getReq.IfModifiedSince = &ifModSince
	}
	if ifNoneMatch := reqHeader.Get("If-None-Match"); ifNoneMatch != "" {
		getReq.IfNoneMatch = &ifNoneMatch
	}
}

func passThroughRespHeaders(getResp *s3.GetObjectOutput, respHeader http.Header) {
	if getResp.ContentType != nil && *getResp.ContentType != "" {
		respHeader.Set("Content-Type", *getResp.ContentType)
	}
	if getResp.ContentEncoding != nil && *getResp.ContentEncoding != "" {
		respHeader.Set("Content-Encoding", *getResp.ContentEncoding)
	}
	if getResp.ETag != nil && *getResp.ETag != "" {
		respHeader.Set("ETag", *getResp.ETag)
	}
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
