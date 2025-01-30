package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"your-backend-module/config" // MinIO yapılandırmasını buradan alıyoruz
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
	"github.com/streadway/amqp"
)

// Helper struct for sending data to Django API
type FilePaths struct {
	InputPath  string `json:"input_path"`
	OutputPath string `json:"output_path"`
}

func failOnError(err error, msg string) {
	if err != nil {
		log.Fatalf("%s: %s", msg, err)
	}
}

// ------------------- Django API CALLS ------------------- //
func callDjangoAPI(inputPath, outputPath string) error {
	data := FilePaths{
		InputPath:  inputPath,
		OutputPath: outputPath,
	}

	jsonData, err := json.Marshal(data)
	if err != nil {
		return fmt.Errorf("failed to marshal data: %v", err)
	}

	resp, err := http.Post("http://127.0.0.1:8000/app/fake-deletion/", "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("failed to call Django API: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := ioutil.ReadAll(resp.Body)
		return fmt.Errorf("error from Django API: %v, response: %s", resp.Status, body)
	}

	log.Printf("Successfully called Django API for input: %s and output: %s", inputPath, outputPath)
	return nil
}

func callDjangoAPIimp(inputPath, outputPath string, answer string) error {
	data := map[string]interface{}{
		"input_path":  inputPath,
		"output_path": outputPath,
		"answer":      answer,
	}

	jsonData, err := json.Marshal(data)
	if err != nil {
		return fmt.Errorf("failed to marshal data: %v", err)
	}

	resp, err := http.Post("http://127.0.0.1:8000/app/data-imputation/", "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("failed to call Django API: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := ioutil.ReadAll(resp.Body)
		return fmt.Errorf("error from Django API: %v, response: %s", resp.Status, body)
	}

	log.Printf("Successfully called Django API for input: %s and output: %s", inputPath, outputPath)
	return nil
}

// ------------------- TEMP FILES & LOG DELETE ------------------- //
func deleteAllTempFiles(logFilePath string) error {
	if _, err := os.Stat(logFilePath); os.IsNotExist(err) {
		log.Printf("Log file does not exist, skipping delete operation: %s", logFilePath)
		return nil
	}

	data, err := ioutil.ReadFile(logFilePath)
	if err != nil {
		return fmt.Errorf("failed to read log file: %v", err)
	}

	if len(data) == 0 {
		log.Printf("Log file is empty, nothing to delete: %s", logFilePath)
		return nil
	}

	lines := strings.Split(string(data), "\n")
	for _, line := range lines {
		if line == "" {
			continue
		}
		parts := strings.Split(line, ",")
		if len(parts) < 4 {
			continue
		}
		tempFilePath := strings.TrimSpace(parts[3])

		if err := os.Remove(tempFilePath); err != nil {
			if os.IsNotExist(err) {
				log.Printf("Temp file already deleted or does not exist: %s", tempFilePath)
			} else {
				log.Printf("Failed to delete temp file: %s, error: %v", tempFilePath, err)
			}
		} else {
			log.Printf("Deleted temp file: %s", tempFilePath)
		}
	}

	err = ioutil.WriteFile(logFilePath, []byte(""), 0644)
	if err != nil {
		return fmt.Errorf("failed to clear log file: %v", err)
	}

	log.Printf("Successfully cleared log file: %s", logFilePath)
	return nil
}

// ------------------- MINIO HELPER (Opsiyonel) ------------------- //

// getFileContent, gelen `documentPath` eğer MinIO URL'si (http:// veya https://) ise
// MinIO'dan dosyayı indirip []byte olarak döndürür. Yoksa local okur.
func getFileContent(documentPath string) ([]byte, error) {
	if strings.HasPrefix(documentPath, "http://") || strings.HasPrefix(documentPath, "https://") {
		parts := strings.Split(documentPath, "/")
		if len(parts) < 5 {
			return nil, fmt.Errorf("invalid MinIO path format: %s", documentPath)
		}
		objectName := strings.Join(parts[4:], "/")

		minioClient, err := minio.New(config.MinioEndpoint, &minio.Options{
			Creds:  credentials.NewStaticV4(config.MinioAccessKey, config.MinioSecretKey, ""),
			Secure: false,
		})
		if err != nil {
			return nil, fmt.Errorf("failed to connect to MinIO: %v", err)
		}

		obj, err := minioClient.GetObject(context.TODO(), config.BucketName, objectName, minio.GetObjectOptions{})
		if err != nil {
			return nil, fmt.Errorf("error fetching file from MinIO: %v", err)
		}
		defer obj.Close()

		fileContent, err := io.ReadAll(obj)
		if err != nil {
			return nil, fmt.Errorf("error reading file content from MinIO: %v", err)
		}
		return fileContent, nil
	}

	// Local dosya gibi oku
	return ioutil.ReadFile(documentPath)
}

// ------------------- MAIN (RABBITMQ CONSUMER) ------------------- //
func main() {
	conn, err := amqp.Dial("amqp://guest:guest@localhost:5672/")
	failOnError(err, "Failed to connect to RabbitMQ")
	defer conn.Close()

	ch, err := conn.Channel()
	failOnError(err, "Failed to open a channel")
	defer ch.Close()

	q, err := ch.QueueDeclare(
		"pipeline_queue",
		false, false, false, false,
		nil,
	)
	failOnError(err, "Failed to declare a queue")

	msgs, err := ch.Consume(
		q.Name,
		"",
		true,  // Auto-ack
		false, // Exclusive
		false, // No-local
		false, // No-wait
		nil,
	)
	failOnError(err, "Failed to register a consumer")

	baseDir, err := os.Getwd()
	if err != nil {
		log.Fatalf("Failed to get current directory: %v", err)
	}
	parentDir := filepath.Dir(baseDir)

	// scripts/tempdata
	scriptsDir := filepath.Join(parentDir, "scripts")
	tempDataDir := filepath.Join(scriptsDir, "tempdata")
	if err := os.MkdirAll(tempDataDir, os.ModePerm); err != nil {
		log.Fatalf("Failed to create tempdata directory: %v", err)
	}

	tempPaths := make(map[string]string)
	var mu sync.Mutex

	forever := make(chan bool)

	go func() {
		for d := range msgs {
			fmt.Printf("Received a message: %s\n", d.Body)

			// rabbitlogs.txt
			logFilePath1 := "rabbitlogs.txt"
			logFile, err := os.OpenFile(logFilePath1, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
			if err != nil {
				log.Printf("Error opening RabbitMQ log file: %v", err)
				continue
			}
			logEntry1 := fmt.Sprintf("Received a message: %s\n", d.Body)
			if _, err := logFile.WriteString(logEntry1); err != nil {
				log.Printf("Error writing to RabbitMQ log file: %v", err)
			}
			logFile.Close()

			messageParts := strings.Split(string(d.Body), ", ")
			if len(messageParts) != 4 {
				log.Printf("Invalid message format: %s", d.Body)
				continue
			}

			questionID := strings.Split(messageParts[0], ": ")[1]
			answer := strings.Split(messageParts[1], ": ")[1]
			documentID := strings.Split(messageParts[2], ": ")[1]
			documentPath := strings.Split(messageParts[3], ": ")[1]

			fmt.Printf("Input path: %s\n", documentPath)

			// 1) Dosyayı (MinIO / local) oku
			fileContent, err := getFileContent(documentPath)
			if err != nil {
				log.Printf("Error reading file from path/MinIO: %v", err)
				continue
			}

			logFilePath := filepath.Join(parentDir, "logs", fmt.Sprintf("rabbitlog%s.txt", documentID))
			if err := os.MkdirAll(filepath.Dir(logFilePath), os.ModePerm); err != nil {
				log.Fatalf("Failed to create logs directory: %v", err)
			}

			if questionID == "1" {
				mu.Lock()
				tempPaths[documentID] = ""
				mu.Unlock()

				log.Printf("First question received, deleting all temp files for DocumentID: %s", documentID)
				if err := deleteAllTempFiles(logFilePath); err != nil {
					log.Printf("Error deleting temp files: %v", err)
					continue
				}
			}

			mu.Lock()
			tempFilePath, exists := tempPaths[documentID]
			mu.Unlock()

			var newTempFilePath string

			// Eğer tempPath yoksa, yani ilk kez işlem
			if !exists || tempFilePath == "" {
				originalFileName := filepath.Base(documentPath)
				ext := filepath.Ext(originalFileName)
				baseFileName := originalFileName[:len(originalFileName)-len(ext)]

				// SORU 1 -> someid_{1_ml}.xlsx
				newTempFilePath = fmt.Sprintf("%s_{%s_%s}%s", baseFileName, questionID, answer, ext)
				newTempFilePath = filepath.Join(tempDataDir, newTempFilePath)

				if err := ioutil.WriteFile(newTempFilePath, fileContent, 0644); err != nil {
					log.Printf("Error creating temp file %s: %v", newTempFilePath, err)
					continue
				}

				mu.Lock()
				tempPaths[documentID] = newTempFilePath
				mu.Unlock()

			} else {
				// Mevcut bir temp dosya var, oradan okuyacağız
				existingContent, err := ioutil.ReadFile(tempFilePath)
				if err != nil {
					log.Printf("Error reading temp file %s: %v", tempFilePath, err)
					continue
				}

				originalFileName := filepath.Base(tempFilePath)
				ext := filepath.Ext(originalFileName)

				// BASE ADI OLDUĞU GİBİ KORU, DEVAMINI EKLE
				// Örneğin: 679b6e6dce0c8e7e2367af8d_{1_ml} => {2_yes} => 679b6e6dce0c8e7e2367af8d_{1_ml}_{2_yes}
				baseFileName := originalFileName[:len(originalFileName)-len(ext)]
				// baseFileName: 679b6e6dce0c8e7e2367af8d_{1_ml} => ekleyelim => {2_yes}
				newBaseName := fmt.Sprintf("%s_{%s_%s}", baseFileName, questionID, answer)
				newTempFilePath = newBaseName + ext
				newTempFilePath = filepath.Join(tempDataDir, newTempFilePath)

				// Soru 2, Answer=Yes => Django API
				if questionID == "2" && answer == "Yes" {
					log.Printf("Calling Django API for second question Option 1")
					if err := callDjangoAPI(tempFilePath, newTempFilePath); err != nil {
						log.Printf("Error calling Django API: %v", err)
						continue
					}
				} else if questionID == "3" {
					// 3. soru imputation
					log.Printf("Third question received, calling Django API for imputation")
					if err := callDjangoAPIimp(tempFilePath, newTempFilePath, answer); err != nil {
						log.Printf("Error calling Django API for imputation: %v", err)
						continue
					}
				} else {
					// Diğer durumlarda direkt kopyala
					if err := ioutil.WriteFile(newTempFilePath, existingContent, 0644); err != nil {
						log.Printf("Error creating updated temp file %s: %v", newTempFilePath, err)
						continue
					}
				}

				mu.Lock()
				tempPaths[documentID] = newTempFilePath
				mu.Unlock()
			}

			logEntry := fmt.Sprintf("%s,%s,%s,%s\n", questionID, answer, documentID, newTempFilePath)
			f, err := os.OpenFile(logFilePath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
			if err != nil {
				log.Printf("Error opening log file %s: %v", logFilePath, err)
				continue
			}
			defer f.Close()

			if _, err := f.WriteString(logEntry); err != nil {
				log.Printf("Error writing to log file %s: %v", logFilePath, err)
				continue
			}

			log.Printf("Successfully processed and logged for DocumentID: %s\n", documentID)
		}
	}()

	log.Printf(" [*] Waiting for messages. To exit press CTRL+C")
	<-forever
}
