package models
import "go.mongodb.org/mongo-driver/bson/primitive"

// User defines the structure of a user in the database
type User struct {
    ID       primitive.ObjectID `bson:"_id,omitempty"` // MongoDB'nin otomatik ObjectId'si
    Username string `json:"username"`
    Password string `json:"password"`
}
