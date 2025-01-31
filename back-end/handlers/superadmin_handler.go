package handlers

import (
	"context"
	"net/http"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"github.com/gin-gonic/gin"
)


// SuperadminStatsHandler - Superadmin panel istatistiklerini döndürür (log olmadan)
func SuperadminStatsHandler(userCollection *mongo.Collection, documentCollection *mongo.Collection) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := context.Background()

		// Kullanıcı sayısını al
		userCount, err := userCollection.CountDocuments(ctx, bson.M{})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not fetch user count"})
			return
		}

		// Döküman sayısını al
		documentCount, err := documentCollection.CountDocuments(ctx, bson.M{})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not fetch document count"})
			return
		}

		// Hata loglarını şimdilik sıfır olarak döndür
		errorLogCount := 0

		// JSON olarak geri döndür
		c.JSON(http.StatusOK, gin.H{
			"totalUsers":    userCount,
			"totalDocuments": documentCount,
			"totalErrors":    errorLogCount,
		})
	}
}
