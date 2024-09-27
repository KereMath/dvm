package handlers

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"

	"github.com/gin-gonic/gin"
)

// UploadHandler handles file uploads
func UploadHandler() gin.HandlerFunc {
	fmt.Println("UploadHandler called") // Fonksiyon çağrıldığında bu mesaj yazılacak

	return func(c *gin.Context) {
		fmt.Println("UploadHandler called") // Fonksiyon çağrıldığında bu mesaj yazılacak

		// Dosyayı formdan alıyoruz
		file, err := c.FormFile("file")
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
			return
		}

		// 'data' klasörü olup olmadığını kontrol edelim, yoksa oluşturalım
		dataFolder := "./data"
		if _, err := os.Stat(dataFolder); os.IsNotExist(err) {
			err = os.Mkdir(dataFolder, os.ModePerm) // Klasörü oluştur
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not create data folder"})
				return
			}
		}

		// Dosya yolu oluşturuluyor
		filePath := filepath.Join(dataFolder, file.Filename)

		// Dosyayı 'data' klasörüne kaydet
		if err := c.SaveUploadedFile(file, filePath); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not save file"})
			return
		}

		// Başarıyla dosya yüklendi
		c.JSON(http.StatusOK, gin.H{
			"message": fmt.Sprintf("File %s uploaded successfully", file.Filename),
		})
	}
}
