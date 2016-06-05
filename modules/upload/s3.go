package upload

import (
	"bytes"
	"log"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/credentials"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
	"github.com/chadweimer/gomp/modules/conf"
)

// S3Driver is an implementation of Driver that uses the Amazon S3.
type S3Driver struct {
	cfg *conf.Config
}

func NewS3Driver(cfg *conf.Config) S3Driver {
	return S3Driver{cfg: cfg}
}

func (u S3Driver) connectToS3() *s3.S3 {
	awsConfig := &aws.Config{
		Region: aws.String(u.cfg.AwsRegion),
	}
	if u.cfg.AwsAccessKeyID != "" && u.cfg.AwsSecretAccessKey != "" {
		awsConfig.Credentials = credentials.NewStaticCredentials(u.cfg.AwsAccessKeyID, u.cfg.AwsSecretAccessKey, "")
	}
	return s3.New(session.New(awsConfig))
}

func (u S3Driver) Save(filePath string, data []byte) error {
	svc := u.connectToS3()

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

func (u S3Driver) Delete(filePath string) error {
	svc := u.connectToS3()

	bucket := u.cfg.UploadPath
	key := filepath.ToSlash(filePath)

	_, err := svc.DeleteObject(&s3.DeleteObjectInput{
		Bucket: &bucket,
		Key:    &key,
	})
	return err
}
func (u S3Driver) DeleteAll(dirPath string) error {

	svc := u.connectToS3()

	bucket := u.cfg.UploadPath
	prefix := filepath.ToSlash(dirPath)

	listOutput, err := svc.ListObjectsV2(&s3.ListObjectsV2Input{
		Bucket: &bucket,
		Prefix: &prefix,
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

func (u S3Driver) List(dirPath string) ([]string, []string, []string, error) {
	var names []string
	var origURLs []string
	var thumbURLs []string

	svc := u.connectToS3()

	bucket := u.cfg.UploadPath
	prefix := filepath.ToSlash(filepath.Join(dirPath, "images"))

	listOutput, err := svc.ListObjectsV2(&s3.ListObjectsV2Input{
		Bucket: &bucket,
		Prefix: &prefix,
	})
	if err != nil {
		return names, origURLs, thumbURLs, err
	}

	for _, object := range listOutput.Contents {
		origReq, _ := svc.GetObjectRequest(&s3.GetObjectInput{
			Bucket: &bucket,
			Key:    object.Key,
		})
		origURL, err := origReq.Presign(30 * time.Minute)
		if err == nil {
			urlSegments := strings.Split(*object.Key, "/")
			name := urlSegments[len(urlSegments)-1]

			names = append(names, name)
			origURLs = append(origURLs, origURL)

			thumbKey := strings.Replace(*object.Key, "/images/", "/thumbs/", 1)
			thumbReq, _ := svc.GetObjectRequest(&s3.GetObjectInput{
				Bucket: &bucket,
				Key:    &thumbKey,
			})
			thumbURL, err := thumbReq.Presign(30 * time.Minute)
			if err == nil {
				thumbURLs = append(thumbURLs, thumbURL)
			} else {
				thumbURLs = append(thumbURLs, "")
			}
		}
	}

	return names, origURLs, thumbURLs, nil
}
