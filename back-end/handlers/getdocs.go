package handlers

import (
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
	"path/filepath"

	"github.com/dgrijalva/jwt-go"
	"github.com/gin-gonic/gin"
)

// GetDocumentsHandler handles retrieving user documents
func GetDocumentsHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		fmt.Println("GetDocumentsHandler started")

		// JWT Token'dan kullanıcı ID'sini alıyoruz
		tokenString := c.GetHeader("Authorization")
		fmt.Println("Authorization header received:", tokenString)

		if len(tokenString) < 7 || tokenString[:7] != "Bearer " {
			fmt.Println("Authorization token missing or incorrect format")
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization token is required"})
			return
		}

		// Remove "Bearer " prefix
		tokenString = tokenString[7:]
		fmt.Println("Token without Bearer prefix:", tokenString)

		claims := jwt.MapClaims{}
		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			fmt.Println("Parsing token")
			return jwtKey, nil
		})

		if err != nil {
			fmt.Println("Error parsing token:", err)
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			return
		}

		if !token.Valid {
			fmt.Println("Token is invalid")
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			return
		}

		// Token'dan userID'yi alıyoruz
		userID, ok := claims["user_id"].(string)
		if !ok {
			fmt.Println("Could not extract user ID from token claims")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not extract user ID from token"})
			return
		}
		fmt.Println("User ID extracted from token:", userID)

		// Kullanıcının klasörüne bakıyoruz
		userFolder := filepath.Join("..", "data", userID)
		fmt.Println("User folder path:", userFolder)

		if _, err := os.Stat(userFolder); os.IsNotExist(err) {
			fmt.Println("User folder does not exist")
			c.JSON(http.StatusNotFound, gin.H{"error": "No documents found"})
			return
		}

		// Klasördeki dosyaları listeliyoruz
		fmt.Println("Reading files in user folder")
		files, err := ioutil.ReadDir(userFolder)
		if err != nil {
			fmt.Println("Error reading user folder:", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not read user folder"})
			return
		}

		// Dosya adlarını bir slice içinde topluyoruz
		fmt.Println("Building file list")
		fileList := []string{}
		for _, file := range files {
			fmt.Println("Found file:", file.Name())
			fileList = append(fileList, file.Name())
		}

		// Dosya listesini JSON olarak döndürüyoruz
		fmt.Println("Returning file list as JSON")
		fmt.Println(fileList)

		c.JSON(http.StatusOK, gin.H{
			"documents": fileList,
		})
	}
}
