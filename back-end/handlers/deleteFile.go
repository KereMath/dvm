package handlers

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"your-backend-module/config" // MinIO yapılandırmasını almak için
	"github.com/gin-gonic/gin"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

// DeleteFileHandler handles the deletion of a file from MinIO and its metadata from MongoDB
func DeleteFileHandler(documentCollection *mongo.Collection) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get the document ID from the URL
		documentIDString := c.Param("id")
		fmt.Println("Deleting document ID:", documentIDString)

		documentID, err := primitive.ObjectIDFromHex(documentIDString)
		if err != nil {
			fmt.Println("Invalid document ID:", err)
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid document ID"})
			return
		}

		// Find the document in MongoDB
		var document struct {
			Path string `bson:"path"`
		}
		err = documentCollection.FindOne(context.TODO(), bson.M{"_id": documentID}).Decode(&document)
		if err != nil {
			fmt.Println("Document not found:", err)
			c.JSON(http.StatusNotFound, gin.H{"error": "Document not found"})
			return
		}

		// MinIO bağlantısını oluştur
		minioClient, err := minio.New(config.MinioEndpoint, &minio.Options{
			Creds:  credentials.NewStaticV4(config.MinioAccessKey, config.MinioSecretKey, ""),
			Secure: false, // HTTPS kullanıyorsan true yap
		})
		if err != nil {
			fmt.Println("Failed to connect to MinIO:", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not connect to MinIO"})
			return
		}

		// MinIO içindeki dosyanın gerçek path'ini çıkar
		objectURL := document.Path
		fmt.Println("MinIO Object URL to delete:", objectURL)

		// MinIO içindeki dosyanın object name'ini çıkart
		parts := strings.Split(objectURL, "/")
		if len(parts) < 5 {
			fmt.Println("Invalid MinIO path format:", objectURL)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid MinIO file path format"})
			return
		}
		objectName := strings.Join(parts[4:], "/") // `mybucket/` sonrası path
		fmt.Printf("Extracted Object Name to delete: %s\n", objectName)

		// MinIO'dan dosyayı sil
		err = minioClient.RemoveObject(c, config.BucketName, objectName, minio.RemoveObjectOptions{})
		if err != nil {
			fmt.Println("Error deleting file from MinIO:", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not delete file from MinIO"})
			return
		}

		// MongoDB'den belgeyi sil
		_, err = documentCollection.DeleteOne(context.TODO(), bson.M{"_id": documentID})
		if err != nil {
			fmt.Println("Error deleting document metadata:", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not delete document metadata"})
			return
		}

		fmt.Println("File deleted from MinIO and document metadata removed successfully")
		c.JSON(http.StatusOK, gin.H{"message": "File deleted successfully"})
	}
}
