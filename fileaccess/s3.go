package fileaccess

import (
	"bytes"
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
	return &s3Driver{OnlyFiles(f), svc, bucket}, nil
}

func (u *s3Driver) CopyAll(srcPath, destPath string) error {
	srcKeyPrefix := filepath.ToSlash(srcPath)

	// List all the objects in the source path
	listOutput, err := u.s3.ListObjectsV2(&s3.ListObjectsV2Input{
		Bucket: &u.bucket,
		Prefix: &srcKeyPrefix,
	})
	if err != nil {
		return err
	}

	// Copy all objects to the destination path
	for _, object := range listOutput.Contents {
		err = u.copyFile(object, srcPath, destPath)
		if err != nil {
			return err
		}
	}

	return nil
}

func (u *s3Driver) copyFile(object *s3.Object, srcPath, destPath string) error {
	srcFilePath := filepath.FromSlash(*object.Key)
	relFilePath, err := filepath.Rel(srcPath, srcFilePath)
	if err != nil {
		return err
	}
	destFilePath := filepath.Join(destPath, relFilePath)
	srcFile, err := u.Open(srcFilePath)
	if err != nil {
		return err
	}
	defer srcFile.Close()

	// Read the content of the source file
	data, err := io.ReadAll(srcFile)
	if err != nil {
		return err
	}

	return u.Save(destFilePath, data)
}

func (u *s3Driver) Save(filePath string, data []byte) error {
	key := filepath.ToSlash(filePath)
	contentType := http.DetectContentType(data)
	_, err := u.s3.PutObject(&s3.PutObjectInput{
		Body:        bytes.NewReader(data),
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
