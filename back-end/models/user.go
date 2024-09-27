package models

// User defines the structure of a user in the database
type User struct {
	Username string `json:"username"`
	Password string `json:"password"`
}
