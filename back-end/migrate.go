package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"your-backend-module/config" // SetupDatabase'in olduğu package'ı import et
	"go.mongodb.org/mongo-driver/bson"
)

func migrateUsers() {
	// Veritabanına bağlan
	client, userCollection, _ := config.SetupDatabase()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// "role" alanı olmayan kullanıcıları bul ve "role": 0 olarak güncelle
	filter := bson.M{"role": bson.M{"$exists": false}}
	update := bson.M{"$set": bson.M{"role": 0}}

	updateResult, err := userCollection.UpdateMany(ctx, filter, update)
	if err != nil {
		log.Fatal("Migration failed:", err)
	}

	fmt.Printf("Migration completed: %d users updated.\n", updateResult.ModifiedCount)

	// Bağlantıyı kapat
	client.Disconnect(ctx)
}

func main() {
	fmt.Println("Running migration for users...")
	migrateUsers()
}
