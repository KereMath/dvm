package handlers

import (
    "context"
    "fmt"
    "io"
    "net/http"
    "strings"

    "github.com/gin-gonic/gin"
    "github.com/minio/minio-go/v7"
    "github.com/minio/minio-go/v7/pkg/credentials"
    "go.mongodb.org/mongo-driver/bson"
    "go.mongodb.org/mongo-driver/bson/primitive"
    "go.mongodb.org/mongo-driver/mongo"
    "your-backend-module/config"  // MinIO yapılandırmasını import ettik
    "your-backend-module/models"
)

// DocumentContentHandler MinIO'dan dosyayı alıp döndürür
func DocumentContentHandler(documentCollection *mongo.Collection) gin.HandlerFunc {
    return func(c *gin.Context) {
        documentID := c.Param("docID") // Parametreden docID alınıyor
        fmt.Println("Fetching document with ID:", documentID)

        // ObjectID'yi oluşturuyoruz
        docObjectID, err := primitive.ObjectIDFromHex(documentID)
        if err != nil {
            fmt.Println("Invalid document ID:", err)
            c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid document ID"})
            return
        }

        // Document'ı MongoDB'den bulma
        var document models.Document
        err = documentCollection.FindOne(context.TODO(), bson.M{"_id": docObjectID}).Decode(&document)
        if err != nil {
            fmt.Println("Document not found:", err)
            c.JSON(http.StatusNotFound, gin.H{"error": "Document not found"})
            return
        }

        // MinIO bağlantısını oluştur
        minioClient, err := minio.New(config.MinioEndpoint, &minio.Options{
            Creds:  credentials.NewStaticV4(config.MinioAccessKey, config.MinioSecretKey, ""),
            Secure: false, // HTTP kullanıyorsan false, HTTPS kullanıyorsan true
        })
        if err != nil {
            fmt.Println("Failed to connect to MinIO:", err)
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not connect to MinIO"})
            return
        }

        // MinIO'daki object path'i belirle
        objectURL := document.Path
        fmt.Println("MinIO Object URL:", objectURL)

        // MinIO içindeki dosyanın gerçek path'ini çıkar
        parts := strings.Split(objectURL, "/")
        if len(parts) < 5 {
            fmt.Println("Invalid MinIO path format:", objectURL)
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid MinIO file path format"})
            return
        }
        objectName := strings.Join(parts[4:], "/") // `mybucket/` sonrası path
        fmt.Printf("Extracted Object Name: %s\n", objectName)

        // MinIO'dan dosyayı getir
        obj, err := minioClient.GetObject(c, config.BucketName, objectName, minio.GetObjectOptions{})
        if err != nil {
            fmt.Println("Error fetching file from MinIO:", err)
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not fetch file from MinIO"})
            return
        }
        defer obj.Close()

        // Dosya içeriğini oku
        fileContent, err := io.ReadAll(obj)
        if err != nil {
            fmt.Println("Error reading file content:", err)
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not read file content"})
            return
        }

        // Dosya uzantısını al ve uygun Content-Type belirle
        var contentType string
        if strings.HasSuffix(objectName, ".csv") {
            contentType = "text/csv"
        } else if strings.HasSuffix(objectName, ".xls") || strings.HasSuffix(objectName, ".xlsx") {
            contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        } else {
            contentType = "application/octet-stream"
        }

        c.Data(http.StatusOK, contentType, fileContent)
    }
}
