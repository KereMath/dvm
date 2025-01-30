package handlers

import (
	"bytes"
	"fmt"
	"io"
	"log"
	"net/http"
	"path/filepath"

	"your-backend-module/models"
	"your-backend-module/config" // MinIO yapılandırmasını kullanmak için ekledik
	"github.com/dgrijalva/jwt-go"
	"github.com/gin-gonic/gin"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

func UploadHandler(documentCollection *mongo.Collection) gin.HandlerFunc {
	return func(c *gin.Context) {
		fmt.Println("UploadHandler started")

		// JWT'den Kullanıcı ID'sini Al
		tokenString := c.GetHeader("Authorization")
		if len(tokenString) < 7 || tokenString[:7] != "Bearer " {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization token is required"})
			return
		}
		tokenString = tokenString[7:]

		claims := jwt.MapClaims{}
		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			return jwtKey, nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			return
		}

		userIDString, ok := claims["user_id"].(string)
		if !ok {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not extract user ID from token"})
			return
		}

		userID, err := primitive.ObjectIDFromHex(userIDString)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID"})
			return
		}
		fmt.Println("User ID:", userID.Hex())

		// Yüklenen Dosyayı Al
		file, err := c.FormFile("file")
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
			return
		}
		fmt.Println("File uploaded:", file.Filename)

		// MongoDB'ye Dosya Bilgisi Kaydet
		document := models.Document{
			Owner:        userID,
			OriginalName: file.Filename,
		}

		insertResult, err := documentCollection.InsertOne(c, document)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not save document metadata"})
			return
		}

		documentID := insertResult.InsertedID.(primitive.ObjectID)
		fmt.Println("Document ID:", documentID.Hex())

		// MinIO'ya Bağlan
		minioClient, err := minio.New(config.MinioEndpoint, &minio.Options{
			Creds:  credentials.NewStaticV4(config.MinioAccessKey, config.MinioSecretKey, ""),
			Secure: false, // HTTP Kullanıyorsan false, HTTPS Kullanıyorsan true
		})
		if err != nil {
			log.Println("Failed to connect to MinIO:", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not connect to MinIO"})
			return
		}

		// MinIO'da Bucket Kontrolü
		exists, err := minioClient.BucketExists(c, config.BucketName)
		if err != nil {
			log.Println("Error checking bucket:", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not check bucket"})
			return
		}
		if !exists {
			fmt.Println("Bucket does not exist. Creating:", config.BucketName)
			err = minioClient.MakeBucket(c, config.BucketName, minio.MakeBucketOptions{})
			if err != nil {
				log.Println("Error creating bucket:", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not create bucket"})
				return
			}
		}

		// MinIO İçin Dosya Adı Belirleme
		ext := filepath.Ext(file.Filename)
		objectName := fmt.Sprintf("%s/%s%s", userID.Hex(), documentID.Hex(), ext)

		// Dosyayı Aç ve MinIO'ya Yükle
		srcFile, err := file.Open()
		if err != nil {
			log.Println("Error opening file:", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not open uploaded file"})
			return
		}
		defer srcFile.Close()

		fileBuffer := new(bytes.Buffer)
		_, err = io.Copy(fileBuffer, srcFile)
		if err != nil {
			log.Println("Error reading file:", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not read uploaded file"})
			return
		}

		_, err = minioClient.PutObject(c, config.BucketName, objectName, fileBuffer, int64(file.Size), minio.PutObjectOptions{
			ContentType: "application/octet-stream",
		})
		if err != nil {
			log.Println("Error uploading to MinIO:", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not upload file to MinIO"})
			return
		}

		// MinIO'da Saklanan Dosyanın URL'sini MongoDB'ye Kaydet
		fileURL := fmt.Sprintf("http://%s/%s/%s", config.MinioEndpoint, config.BucketName, objectName)
		filter := bson.M{"_id": documentID}
		update := bson.M{"$set": bson.M{"path": fileURL}}

		_, err = documentCollection.UpdateOne(c, filter, update)
		if err != nil {
			log.Println("Error updating MongoDB with MinIO URL:", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not update document with file URL"})
			return
		}

		fmt.Println("File successfully uploaded to MinIO:", fileURL)

		c.JSON(http.StatusOK, gin.H{
			"message": fmt.Sprintf("File %s uploaded successfully to MinIO", file.Filename),
			"url":     fileURL,
		})
	}
}
