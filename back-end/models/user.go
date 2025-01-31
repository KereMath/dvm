package models

import "go.mongodb.org/mongo-driver/bson/primitive"

// User defines the structure of a user in the database
type User struct {
    ID       primitive.ObjectID `bson:"_id,omitempty"` // MongoDB'nin otomatik ObjectId'si
    Username string             `json:"username" bson:"username"`
    Password string             `json:"password" bson:"password"`
    Role     int                `json:"role" bson:"role"` // Yeni eklenen alan (0: normal, 1: admin)
}
