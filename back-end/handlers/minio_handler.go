package handlers

import (
	"context"
	"fmt"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

// ---------------------------
// Data Models
// ---------------------------
type FileEntry struct {
	Key          string    `json:"key"`
	Name         string    `json:"name"`
	Size         int64     `json:"size"`
	LastModified time.Time `json:"lastModified"`
	IsDir        bool      `json:"isDir"`
	OwnerName    string    `json:"ownerName"`
	OriginalName string    `json:"originalName"` // from documents collection
}

type ExplorerResponse struct {
	Buckets  []string    `json:"buckets,omitempty"`
	Files    []FileEntry `json:"files,omitempty"`
	IsBucket bool        `json:"isBucket"`
}

// documents tablosu
type DocumentDB struct {
	ID           primitive.ObjectID `bson:"_id,omitempty"`
	Owner        primitive.ObjectID `bson:"owner"`
	Path         string             `bson:"path"` // same as key
	OriginalName string             `bson:"original_name"`
}

// Silme isteği (dosya)
type DeleteRequest struct {
	Bucket string `json:"bucket"`
	Key    string `json:"key"`
}

// Bucket oluşturma/güncelle istek yapısı
type BucketRequest struct {
	BucketName string `json:"bucketName"`
}

// ---------------------------
// MinIO Client
// ---------------------------
func getMinioClient() (*minio.Client, error) {
	endpoint := "localhost:9000"
	accessKey := "admin"
	secretKey := "password"
	useSSL := false

	return minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(accessKey, secretKey, ""),
		Secure: useSSL,
	})
}

// ---------------------------
// 1) Listeleme (Explorer Handler)
// GET /superadmin/minio/explorer?bucket=...&prefix=...
// ---------------------------
func MinioExplorerHandler(
	userCollection, documentCollection *mongo.Collection,
) gin.HandlerFunc {
	return func(c *gin.Context) {
		bucket := c.Query("bucket")
		prefix := c.DefaultQuery("prefix", "")
		search := c.Query("search")
		sortBy := c.DefaultQuery("sort", "name")
		recursive := c.DefaultQuery("recursive", "false")

		client, err := getMinioClient()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "MinIO bağlantı hatası"})
			return
		}

		// Eğer bucket boş -> tüm bucket'ları listeler
		if bucket == "" {
			buckets, err := client.ListBuckets(context.Background())
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Bucket listesi alınamadı"})
				return
			}
			var bucketNames []string
			for _, b := range buckets {
				bucketNames = append(bucketNames, b.Name)
			}
			c.JSON(http.StatusOK, ExplorerResponse{
				Buckets:  bucketNames,
				IsBucket: false,
			})
			return
		}

		// Aksi halde -> belirtilen bucket içeriği
		rec := false
		if strings.ToLower(recursive) == "true" {
			rec = true
		}
		objCh := client.ListObjects(context.Background(), bucket, minio.ListObjectsOptions{
			Prefix:    prefix,
			Recursive: rec,
		})

		var fileList []FileEntry
		for obj := range objCh {
			if obj.Err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": obj.Err.Error()})
				return
			}

			isFolder := false
			if strings.HasSuffix(obj.Key, "/") && obj.Size == 0 {
				isFolder = true
			}

			name := obj.Key
			if strings.Contains(obj.Key, "/") {
				parts := strings.Split(obj.Key, "/")
				name = parts[len(parts)-1]
			}
			// Arama
			if search != "" && !strings.Contains(strings.ToLower(name), strings.ToLower(search)) {
				continue
			}

			// userName => key'den userID parse
			userName := findUsernameByKey(userCollection, obj.Key)
			// originalName => documents tablosundan path=key
			originalName := findDocumentOriginalName(documentCollection, obj.Key)

			fileList = append(fileList, FileEntry{
				Key:          obj.Key,
				Name:         name,
				Size:         obj.Size,
				LastModified: obj.LastModified,
				IsDir:        isFolder,
				OwnerName:    userName,
				OriginalName: originalName,
			})
		}

		// Sıralama
		switch sortBy {
		case "size":
			sort.Slice(fileList, func(i, j int) bool {
				return fileList[i].Size < fileList[j].Size
			})
		case "date":
			sort.Slice(fileList, func(i, j int) bool {
				return fileList[i].LastModified.Before(fileList[j].LastModified)
			})
		case "name":
			fallthrough
		default:
			sort.Slice(fileList, func(i, j int) bool {
				return strings.ToLower(fileList[i].Name) < strings.ToLower(fileList[j].Name)
			})
		}

		c.JSON(http.StatusOK, ExplorerResponse{
			Files:    fileList,
			IsBucket: true,
		})
	}
}

// ---------------------------
// 2) Download Object
// GET /superadmin/minio/download?bucket=...&key=...
// ---------------------------
func DownloadObjectHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		bucket := c.Query("bucket")
		key := c.Query("key")
		if bucket == "" || key == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "bucket ve key gerekli"})
			return
		}

		client, err := getMinioClient()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "MinIO bağlantı hatası"})
			return
		}

		obj, err := client.GetObject(context.Background(), bucket, key, minio.GetObjectOptions{})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		defer obj.Close()

		stat, err := obj.Stat()
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Dosya bulunamadı"})
			return
		}

		contentType := "application/octet-stream"
		c.Writer.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, stat.Key))
		c.DataFromReader(http.StatusOK, stat.Size, contentType, obj, nil)
	}
}

// ---------------------------
// 3) Delete Object
// POST /superadmin/minio/delete {bucket, key}
// Sil => MinIO + MongoDB
// ---------------------------
func DeleteObjectHandler(documentCollection *mongo.Collection) gin.HandlerFunc {
    return func(c *gin.Context) {
        var req DeleteRequest
        if err := c.ShouldBindJSON(&req); err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz istek"})
            return
        }
        if req.Bucket == "" || req.Key == "" {
            c.JSON(http.StatusBadRequest, gin.H{"error": "bucket ve key gerekli"})
            return
        }

        client, err := getMinioClient()
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "MinIO bağlantı hatası"})
            return
        }

        // MinIO'dan sil
        err = client.RemoveObject(context.Background(), req.Bucket, req.Key, minio.RemoveObjectOptions{})
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
            return
        }

        // Key'den fileID'yi çıkart
        fileID, err := extractFileID(req.Key)
        if err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz key formatı"})
            return
        }

        // fileID'yi ObjectID'ye çevir
        objID, err := primitive.ObjectIDFromHex(fileID)
        if err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz dosya ID'si"})
            return
        }

        // MongoDB'den sil
        _, err = documentCollection.DeleteOne(context.Background(), bson.M{"_id": objID})
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Document silinemedi"})
            return
        }

        c.JSON(http.StatusOK, gin.H{"message": "Dosya silindi"})
    }
}

// ---------------------------
// Helpers
// ---------------------------

// extractFileID key içinden dosya ID'sini çıkartır.
// Örneğin: "679c943776f1535719d22115/679cc190f3c6a70f72a3ea51.csv" => "679cc190f3c6a70f72a3ea51"
func extractFileID(key string) (string, error) {
    parts := strings.Split(key, "/")
    if len(parts) < 2 {
        return "", fmt.Errorf("invalid key format")
    }
    fileWithExt := parts[len(parts)-1]
    fileParts := strings.Split(fileWithExt, ".")
    if len(fileParts) < 2 {
        return "", fmt.Errorf("invalid file name format")
    }
    fileID := fileParts[0]
    return fileID, nil
}
// ---------------------------
// 4) Create Bucket
// POST /superadmin/minio/create-bucket { bucketName: "mynewbucket" }
// ---------------------------
func CreateBucketHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req BucketRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz istek"})
			return
		}
		if req.BucketName == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "bucketName gerekli"})
			return
		}
		client, err := getMinioClient()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "MinIO bağlantı hatası"})
			return
		}

		ctx := context.Background()
		err = client.MakeBucket(ctx, req.BucketName, minio.MakeBucketOptions{})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Bucket oluşturuldu", "bucketName": req.BucketName})
	}
}

// ---------------------------
// 5) Remove Bucket
// POST /superadmin/minio/remove-bucket { bucketName: "mynewbucket" }
// sadece boşsa siler, doluysa hata
// ---------------------------
func RemoveBucketHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req BucketRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz istek"})
			return
		}
		if req.BucketName == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "bucketName gerekli"})
			return
		}

		client, err := getMinioClient()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "MinIO bağlantı hatası"})
			return
		}

		ctx := context.Background()
		err = client.RemoveBucket(ctx, req.BucketName)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Bucket silindi", "bucketName": req.BucketName})
	}
}

// ---------------------------
// Helpers
// ---------------------------

// Key içindeki ilk segment => userID => users tablosundan username
func findUsernameByKey(userCollection *mongo.Collection, key string) string {
	if key == "" {
		return "(unknown)"
	}
	parts := strings.Split(key, "/")
	if len(parts) == 0 {
		return "(unknown)"
	}
	userIDhex := parts[0]
	objID, err := primitive.ObjectIDFromHex(userIDhex)
	if err != nil {
		return "(unknown)"
	}
	ctx := context.Background()
	var user struct {
		Username string `bson:"username"`
	}
	err = userCollection.FindOne(ctx, bson.M{"_id": objID}).Decode(&user)
	if err != nil {
		return "(unknown)"
	}
	return user.Username
}

// documents tablosunda path=key => originalName
// documents tablosunda _id=fileID => originalName
func findDocumentOriginalName(documentCollection *mongo.Collection, key string) string {
	if key == "" {
		return ""
	}
	
	// Key'den fileID'yi çıkart
	fileID, err := extractFileID(key)
	if err != nil {
		return ""
	}
	
	// fileID'yi ObjectID'ye çevir
	objID, err := primitive.ObjectIDFromHex(fileID)
	if err != nil {
		return ""
	}

	ctx := context.Background()
	var doc DocumentDB
	err = documentCollection.FindOne(ctx, bson.M{"_id": objID}).Decode(&doc)
	if err != nil {
		return ""
	}
	return doc.OriginalName
}
