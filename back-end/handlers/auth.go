package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"golang.org/x/crypto/bcrypt"

	"your-backend-module/models"
	"github.com/gorilla/sessions"
	"github.com/dgrijalva/jwt-go"


)
var store = sessions.NewCookieStore([]byte("secret-key"))
var jwtKey = []byte("your-secret-key")

func generateJWT(userID, username string) (string, error) {
	claims := jwt.MapClaims{}
	claims["authorized"] = true
	claims["username"] = username
	claims["user_id"] = userID // User ID'yi JWT'ye ekliyoruz
	claims["exp"] = time.Now().Add(time.Hour * 1).Unix() // Token 1 saat geçerli olacak

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtKey)
}

// HelloHandler is just a test route
func HelloHandler(c *gin.Context) {
	
	c.JSON(200, gin.H{
		"message": "Hello from the Go backend with MongoDB Atlas!",
	})
}

// RegisterHandler handles user registration
func RegisterHandler(userCollection *mongo.Collection) gin.HandlerFunc {
    return func(c *gin.Context) {
        var user models.User
        if err := c.ShouldBindJSON(&user); err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
            return
        }

        // Kullanıcı adı zaten var mı?
        var existingUser models.User
        err := userCollection.FindOne(context.Background(), bson.M{"username": user.Username}).Decode(&existingUser)
        if err == nil {
            c.JSON(http.StatusConflict, gin.H{"error": "Username already exists"})
            return
        }

        // Şifreyi hashle
        hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not hash password"})
            return
        }

        user.Password = string(hashedPassword)
        user.Role = 0 // Varsayılan olarak normal kullanıcı (0) atanıyor

        // Yeni kullanıcıyı ekle
        _, err = userCollection.InsertOne(context.Background(), user)
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not register user"})
            return
        }

        c.JSON(http.StatusOK, gin.H{"message": "User registered successfully"})
    }
}


func LoginHandler(userCollection *mongo.Collection) gin.HandlerFunc {
	return func(c *gin.Context) {
		var user models.User
		if err := c.ShouldBindJSON(&user); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
			return
		}

		// Kullanıcıyı MongoDB'den bul
		var storedUser models.User
		err := userCollection.FindOne(context.Background(), bson.M{"username": user.Username}).Decode(&storedUser)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid username or password"})
			return
		}

		// Şifreleri karşılaştır
		if err := bcrypt.CompareHashAndPassword([]byte(storedUser.Password), []byte(user.Password)); err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid username or password"})
			return
		}

		// Token oluştur (hem userID hem de username sağlıyoruz)
		token, err := generateJWT(storedUser.ID.Hex(), user.Username)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not generate token"})
			return
		}

		// Login başarılı, kullanıcı ObjectId'sini ve token'ı döndürüyoruz
		c.JSON(http.StatusOK, gin.H{
			"message":  "Login successful",
			"token":    token,
			"user_id":  storedUser.ID.Hex(),
		})
	}
}

func LogoutHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Tarayıcıdaki JWT token'ı client-side'da silinmesi gerekiyor
		// Backend'de bu durumda yapılacak özel bir işlem yok
		c.JSON(http.StatusOK, gin.H{
			"message": "Logout successful",
		})
	}
}
