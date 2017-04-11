package upload

import (
	"bytes"
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
			s3err, ok := err.(awserr.Error)
			// 304 code is expected
			if ok && s3err.Code() != "NotModified" {
				log.Print(s3err.Error())
				http.Error(resp, s3err.Message(), http.StatusInternalServerError)
				return
			}
		}

		var buf []byte
		// If we got content, read it, including associated headers
		if getResp.ContentLength != nil && *getResp.ContentLength > 0 {
			buf, err = ioutil.ReadAll(getResp.Body)
			if err != nil {
				http.Error(resp, err.Error(), http.StatusInternalServerError)
				return
			}
		}
		passThroughRespHeaders(getResp, resp.Header())

		// Serve up the file to the client
		http.ServeContent(resp, req, filePath, *getResp.LastModified, bytes.NewReader(buf))
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
