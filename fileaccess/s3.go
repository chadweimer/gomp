package fileaccess

import (
	"errors"
	"io"
	"io/fs"
	"net/http"
	"path/filepath"

	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
	"github.com/jszwec/s3fs"
)

// s3Driver is an implementation of Driver that uses the Amazon S3.
type s3Driver struct {
	fs.FS
	s3     *s3.S3
	bucket string
}

func newS3Driver(bucket string) (Driver, error) {
	if bucket == "" {
		return nil, errors.New("bucket name is empty")
	}

	sess, err := session.NewSession()
	if err != nil {
		return nil, err
	}

	svc := s3.New(sess)
	f := s3fs.New(svc, bucket)
	return &s3Driver{f, svc, bucket}, nil
}

func (u *s3Driver) Save(filePath string, reader io.ReadSeeker) error {
	// Make sure we're at the beginning of the content
	_, err := reader.Seek(0, io.SeekStart)
	if err != nil {
		return err
	}

	// Read the first 512 bytes in order to determine the content type
	contentTypeData := make([]byte, 512)
	if _, err = reader.Read(contentTypeData); err != nil {
		return err
	}
	contentType := http.DetectContentType(contentTypeData)

	// Return to the beginning
	if _, err := reader.Seek(0, io.SeekStart); err != nil {
		return err
	}

	key := filepath.ToSlash(filePath)
	_, err = u.s3.PutObject(&s3.PutObjectInput{
		Body:        reader,
		ContentType: &contentType,
		Bucket:      &u.bucket,
		Key:         &key,
	})
	return err
}

func (u *s3Driver) Delete(key string) error {
	key = filepath.ToSlash(key)

	_, err := u.s3.DeleteObject(&s3.DeleteObjectInput{
		Bucket: &u.bucket,
		Key:    &key,
	})
	return err
}

func (u *s3Driver) DeleteAll(keyPrefix string) error {
	keyPrefix = filepath.ToSlash(keyPrefix)

	listOutput, err := u.s3.ListObjectsV2(&s3.ListObjectsV2Input{
		Bucket: &u.bucket,
		Prefix: &keyPrefix,
	})
	if err != nil {
		return err
	}
	for _, object := range listOutput.Contents {
		_, err := u.s3.DeleteObject(&s3.DeleteObjectInput{
			Bucket: &u.bucket,
			Key:    object.Key,
		})
		if err != nil {
			return err
		}
	}

	return nil
}
