package handlers

import (
	"context"
	"net/http"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"golang.org/x/crypto/bcrypt"
	"github.com/gin-gonic/gin"
)

// Kullanıcıları Getirme
func GetUsersHandler(userCollection *mongo.Collection) gin.HandlerFunc {
	return func(c *gin.Context) {
		var users []bson.M
		cursor, err := userCollection.Find(context.Background(), bson.M{})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Kullanıcılar getirilemedi"})
			return
		}
		defer cursor.Close(context.Background())

		if err := cursor.All(context.Background(), &users); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Kullanıcılar çözülemedi"})
			return
		}

		c.JSON(http.StatusOK, users)
	}
}

// Kullanıcı Ekleme
func AddUserHandler(userCollection *mongo.Collection) gin.HandlerFunc {
	return func(c *gin.Context) {
		var user struct {
			Username string `json:"username"`
			Password string `json:"password"`
			Role     int    `json:"role"`
		}

		if err := c.BindJSON(&user); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz istek"})
			return
		}

		hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)

		newUser := bson.M{
			"_id":      primitive.NewObjectID(),
			"username": user.Username,
			"password": string(hashedPassword),
			"role":     user.Role,
		}

		_, err := userCollection.InsertOne(context.Background(), newUser)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Kullanıcı eklenemedi"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Kullanıcı eklendi"})
	}
}

// Kullanıcı Silme
func DeleteUserHandler(userCollection *mongo.Collection) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.Param("id")
		objID, err := primitive.ObjectIDFromHex(userID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz ID"})
			return
		}

		_, err = userCollection.DeleteOne(context.Background(), bson.M{"_id": objID})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Kullanıcı silinemedi"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Kullanıcı silindi"})
	}
}
