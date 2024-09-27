package middleware

import (
    "fmt"
    "github.com/dgrijalva/jwt-go"
    "github.com/gin-gonic/gin"
    "net/http"
)

var jwtKey = []byte("your-secret-key")
func ValidateToken() gin.HandlerFunc {
    return func(c *gin.Context) {
        tokenString := c.GetHeader("Authorization")
        fmt.Println("Received Token:", tokenString)

        if tokenString == "" {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "Missing Authorization header"})
            return
        }

        // Bearer prefix'ini kaldırıyoruz
        tokenString = tokenString[len("Bearer "):]

        // Token'i doğruluyoruz
        token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
            return jwtKey, nil
        })

        if err != nil || !token.Valid {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
            return
        }

        // Token geçerli
        c.JSON(http.StatusOK, gin.H{"message": "Token is valid"})
    }
}
