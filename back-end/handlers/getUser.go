package handlers

import (
	"fmt"
	"net/http"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"github.com/dgrijalva/jwt-go"
	"github.com/gin-gonic/gin"
)

// GetUserHandler retrieves the currently logged-in user's details
func GetUserHandler(userCollection *mongo.Collection) gin.HandlerFunc {
	return func(c *gin.Context) {
		fmt.Println("GetUserHandler started")

		// JWT Token'dan kullanıcı ID'sini alıyoruz
		tokenString := c.GetHeader("Authorization")
		if len(tokenString) < 7 || tokenString[:7] != "Bearer " {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization token is required"})
			return
		}

		tokenString = tokenString[7:] // "Bearer " kısmını kaldır
		claims := jwt.MapClaims{}
		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			return jwtKey, nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			return
		}

		// Token'dan user_id'yi alıyoruz
		userIDString, ok := claims["user_id"].(string)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token claims"})
			return
		}

		userID, err := primitive.ObjectIDFromHex(userIDString)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID"})
			return
		}

		// Kullanıcı bilgilerini MongoDB'den çekiyoruz
		var user struct {
			ID       primitive.ObjectID `bson:"_id"`
			Username string             `bson:"username"`
			Role     int                `bson:"role"`
		}

		err = userCollection.FindOne(c, bson.M{"_id": userID}).Decode(&user)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not retrieve user information"})
			return
		}

		// Kullanıcı bilgilerini JSON olarak döndürüyoruz
		c.JSON(http.StatusOK, gin.H{
			"user_id":  user.ID.Hex(),
			"username": user.Username,
			"role":     user.Role, // Artık role bilgisi de dönüyor
		})
	}
}

