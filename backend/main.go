package main

import (
	"fmt"
	"log"
	"os"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/yourusername/sql-interpreter/handlers"
	"github.com/yourusername/sql-interpreter/services"
)

func main() {
	// Load environment variables from .env file
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: Error loading .env file:", err)
	}

	// Set up Supabase service
	supabaseService := services.NewSupabaseService()

	// Validate required environment variables
	if supabaseService.URL == "" || supabaseService.Key == "" {
		log.Fatal("Error: SUPABASE_URL and SUPABASE_KEY environment variables are required")
	}

	// Set up handlers
	queryHandler := handlers.NewQueryHandler(supabaseService)

	// Create Gin router
	router := gin.Default()

	// Configure CORS
	config := cors.DefaultConfig()
	config.AllowAllOrigins = true
	config.AllowMethods = []string{"GET", "POST", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Type", "Authorization"}
	router.Use(cors.New(config))

	// API routes
	api := router.Group("/api")
	{
		query := api.Group("/query")
		{
			query.POST("/execute", queryHandler.ExecuteQuery)
			query.GET("/schema", queryHandler.GetDatabaseSchema)
			query.POST("/validate", queryHandler.ValidateQuery)
			query.GET("/history", queryHandler.GetQueryHistory)
		}
	}

	// Set up server port
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Start server
	fmt.Printf("Server starting on port %s...\n", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatal("Error starting server:", err)
	}
}
