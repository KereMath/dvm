package main

import (
    "flag"
    "fmt"
    "your-backend-module/config"
    "your-backend-module/handlers"
    "your-backend-module/middlewares"
    "time"
    "context"
    "github.com/gin-contrib/cors"
    "github.com/gin-gonic/gin"
)

func main() {
    // 1) Portu bir flag olarak tanımlıyoruz
    portFlag := flag.String("port", "8080", "HTTP port")
    flag.Parse()

    // 2) Gin router
    r := gin.Default()
    r.Use(cors.New(cors.Config{
        AllowOrigins:     []string{"http://localhost:4200"},
        AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
        AllowHeaders:     []string{"Authorization", "Content-Type"},
        ExposeHeaders:    []string{"Authorization"},
        AllowCredentials: true,
        MaxAge:           12 * time.Hour,
    }))

    // Setup database connection
    client, userCollection, documentCollection := config.SetupDatabase()
    defer client.Disconnect(context.Background())

    // Routes
    r.GET("/hello-backend", handlers.HelloHandler)
    r.POST("/register", handlers.RegisterHandler(userCollection))
    r.POST("/login", handlers.LoginHandler(userCollection))
    r.POST("/upload", handlers.UploadHandler(documentCollection))
    r.GET("/validate-token", middleware.ValidateToken()) // Orta katman fonksiyon adını düzelt
    r.GET("/documents", handlers.GetDocumentsHandler(documentCollection))
    r.DELETE("/delete-file/:id", handlers.DeleteFileHandler(documentCollection))
    r.GET("/documents/:docID", handlers.GetSingleDocumentHandler(documentCollection))
    r.GET("/document-content/:docID", handlers.DocumentContentHandler(documentCollection))
    r.POST("/process-question", handlers.PipelineManagerHandler)
    r.GET("/user", handlers.GetUserHandler(userCollection))
    r.GET("/superadmin/stats", handlers.SuperadminStatsHandler(userCollection, documentCollection))
    r.GET("/superadmin/users", handlers.GetUsersHandler(userCollection))
    r.POST("/superadmin/users", handlers.AddUserHandler(userCollection))
    r.DELETE("/superadmin/users/:id", handlers.DeleteUserHandler(userCollection))
	r.GET("/superadmin/minio/explorer", handlers.MinioExplorerHandler(userCollection, documentCollection))
    r.GET("/superadmin/minio/download", handlers.DownloadObjectHandler())
    r.POST("/superadmin/minio/delete", handlers.DeleteObjectHandler(documentCollection))
    r.POST("/superadmin/minio/create-bucket", handlers.CreateBucketHandler())
    r.POST("/superadmin/minio/remove-bucket", handlers.RemoveBucketHandler())
    // 3) Port parametresini kullan
    address := fmt.Sprintf(":%s", *portFlag)
    r.Run(address)
}
