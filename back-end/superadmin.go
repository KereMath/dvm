package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"your-backend-module/config"
	"your-backend-module/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"golang.org/x/crypto/bcrypt"
)

// Superadmin'i oluşturma fonksiyonu
func createSuperadmin(userCollection *mongo.Collection) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Zaten superadmin var mı kontrol et
	var existingUser models.User
	err := userCollection.FindOne(ctx, bson.M{"role": 2}).Decode(&existingUser)
	if err == nil {
		fmt.Println("Superadmin already exists, skipping creation.")
		return
	}

	// Şifreyi hashle
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("superadmin"), bcrypt.DefaultCost)

	// Yeni Superadmin oluştur
	superadmin := models.User{
		ID:       primitive.NewObjectID(),
		Username: "superadmin",
		Password: string(hashedPassword),
		Role:     2, // 2 = superadmin
	}

	_, err = userCollection.InsertOne(ctx, superadmin)
	if err != nil {
		log.Fatal("Failed to create superadmin:", err)
	}

	fmt.Println("Superadmin created successfully.")
}

func main() {
	fmt.Println("Checking for superadmin user...")
	_, userCollection, _ := config.SetupDatabase()
	createSuperadmin(userCollection)
}
