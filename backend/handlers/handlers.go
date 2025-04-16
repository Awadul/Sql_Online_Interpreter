package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/yourusername/sql-interpreter/models"
	"github.com/yourusername/sql-interpreter/services"
)

// QueryHandler handles API requests related to SQL queries
type QueryHandler struct {
	supabaseService *services.SupabaseService
}

// NewQueryHandler creates a new query handler
func NewQueryHandler(supabaseService *services.SupabaseService) *QueryHandler {
	return &QueryHandler{
		supabaseService: supabaseService,
	}
}

// ExecuteQuery handles the request to execute an SQL query
func (h *QueryHandler) ExecuteQuery(c *gin.Context) {
	var req models.QueryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.QueryResponse{
			Error: "Invalid request format: " + err.Error(),
		})
		return
	}

	// Check if query is empty
	if req.Query == "" {
		c.JSON(http.StatusBadRequest, models.QueryResponse{
			Error: "Query cannot be empty",
		})
		return
	}

	// Execute the query
	result, err := h.supabaseService.ExecuteQuery(req.Query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.QueryResponse{
			Error: "Failed to execute query: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, result)
}

// GetDatabaseSchema handles the request to get the database schema
func (h *QueryHandler) GetDatabaseSchema(c *gin.Context) {
	// Get the schema from Supabase
	schema, err := h.supabaseService.GetDatabaseSchema()
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.SchemaResponse{
			Error: "Failed to get database schema: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, schema)
}

// ValidateQuery handles the request to validate an SQL query
func (h *QueryHandler) ValidateQuery(c *gin.Context) {
	var req models.QueryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"valid": false,
			"error": "Invalid request format: " + err.Error(),
		})
		return
	}

	// Check if query is empty
	if req.Query == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"valid": false,
			"error": "Query cannot be empty",
		})
		return
	}

	// Validate the query
	valid, errorMsg, err := h.supabaseService.ValidateQuery(req.Query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"valid": false,
			"error": "Failed to validate query: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"valid": valid,
		"error": errorMsg,
	})
}

// GetQueryHistory handles the request to get query execution history
func (h *QueryHandler) GetQueryHistory(c *gin.Context) {
	limitStr := c.DefaultQuery("limit", "20")
	limit := 20

	// Parse limit parameter
	if limitStr != "" {
		var err error
		limit, err = strconv.Atoi(limitStr)
		if err != nil || limit <= 0 {
			limit = 20
		}
	}

	// Get query history
	history, err := h.supabaseService.GetQueryHistory(limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get query history: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"history": history,
	})
}
