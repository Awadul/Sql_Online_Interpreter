package services

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/yourusername/sql-interpreter/models"
)

// SupabaseService handles interactions with Supabase
type SupabaseService struct {
	URL string
	Key string
}

// NewSupabaseService creates a new Supabase service instance
func NewSupabaseService() *SupabaseService {
	return &SupabaseService{
		URL: os.Getenv("SUPABASE_URL"),
		Key: os.Getenv("SUPABASE_KEY"),
	}
}

// ValidateQuery validates an SQL query before execution
func (s *SupabaseService) ValidateQuery(query string) (bool, string, error) {
	// Prepare the request to Supabase REST API
	endpoint := fmt.Sprintf("%s/rest/v1/rpc/validate_query", s.URL)

	// Create JSON payload with the SQL query
	payload := strings.NewReader(fmt.Sprintf(`{"query": %q}`, query))

	// Create HTTP request
	req, err := http.NewRequest("POST", endpoint, payload)
	if err != nil {
		return false, "", err
	}

	// Set headers
	req.Header.Add("apikey", s.Key)
	req.Header.Add("Authorization", "Bearer "+s.Key)
	req.Header.Add("Content-Type", "application/json")

	// Execute the request
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return false, "", err
	}
	defer resp.Body.Close()

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return false, "", err
	}

	// Parse response JSON
	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		return false, "", err
	}

	// Check validation result
	valid, _ := result["valid"].(bool)
	errorMsg, _ := result["error"].(string)

	return valid, errorMsg, nil
}

// SaveQueryHistory saves the query execution history
func (s *SupabaseService) SaveQueryHistory(query string, executionTime int64, isSuccessful bool, errorMessage string) error {
	// Prepare the request to Supabase REST API
	endpoint := fmt.Sprintf("%s/rest/v1/rpc/save_query_history", s.URL)

	// Create JSON payload
	payloadData := map[string]interface{}{
		"query":     query,
		"exec_time": executionTime,
		"success":   isSuccessful,
	}

	if errorMessage != "" {
		payloadData["error"] = errorMessage
	}

	payloadBytes, err := json.Marshal(payloadData)
	if err != nil {
		return err
	}

	payload := strings.NewReader(string(payloadBytes))

	// Create HTTP request
	req, err := http.NewRequest("POST", endpoint, payload)
	if err != nil {
		return err
	}

	// Set headers
	req.Header.Add("apikey", s.Key)
	req.Header.Add("Authorization", "Bearer "+s.Key)
	req.Header.Add("Content-Type", "application/json")

	// Execute the request
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	return nil
}

// ExecuteQuery executes an SQL query on Supabase PostgreSQL
func (s *SupabaseService) ExecuteQuery(query string) (*models.QueryResponse, error) {
	startTime := time.Now()

	// First validate the query
	valid, errorMsg, err := s.ValidateQuery(query)
	if err != nil {
		return nil, err
	}

	if !valid {
		executionTime := time.Since(startTime).Milliseconds()
		// Save failed query to history
		_ = s.SaveQueryHistory(query, executionTime, false, errorMsg)

		return &models.QueryResponse{
			Columns:       []string{},
			Rows:          [][]interface{}{},
			Error:         fmt.Sprintf("Invalid query: %s", errorMsg),
			ExecutionTime: executionTime,
			RowCount:      0,
		}, nil
	}

	// Prepare the request to Supabase REST API
	endpoint := fmt.Sprintf("%s/rest/v1/rpc/execute_sql", s.URL)

	// Create JSON payload with the SQL query
	payload := strings.NewReader(fmt.Sprintf(`{"query": %q}`, query))

	// Create HTTP request
	req, err := http.NewRequest("POST", endpoint, payload)
	if err != nil {
		return nil, err
	}

	// Set headers
	req.Header.Add("apikey", s.Key)
	req.Header.Add("Authorization", "Bearer "+s.Key)
	req.Header.Add("Content-Type", "application/json")

	// Execute the request
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	// Calculate execution time
	executionTime := time.Since(startTime).Milliseconds()

	// Handle error responses
	if resp.StatusCode != http.StatusOK {
		errorMsg := fmt.Sprintf("Supabase error: %s", string(body))
		// Save failed query to history
		_ = s.SaveQueryHistory(query, executionTime, false, errorMsg)

		return &models.QueryResponse{
			Columns:       []string{},
			Rows:          [][]interface{}{},
			Error:         errorMsg,
			ExecutionTime: executionTime,
			RowCount:      0,
		}, nil
	}

	// Print raw response for debugging
	fmt.Println("Raw response:", string(body))

	// Parse response JSON
	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}

	// Check for errors in the response
	if errMsg, ok := result["error"].(string); ok && errMsg != "" {
		// Save failed query to history
		_ = s.SaveQueryHistory(query, executionTime, false, errMsg)

		return &models.QueryResponse{
			Columns:       []string{},
			Rows:          [][]interface{}{},
			Error:         errMsg,
			ExecutionTime: executionTime,
			RowCount:      0,
		}, nil
	}

	// Extract columns
	columns := []string{}
	if cols, ok := result["columns"].([]interface{}); ok {
		for _, col := range cols {
			if colStr, ok := col.(string); ok {
				columns = append(columns, colStr)
			}
		}
	}

	// Extract rows
	rows := [][]interface{}{}
	if rowsData, ok := result["rows"].([]interface{}); ok {
		for _, rowObj := range rowsData {
			if rowArr, ok := rowObj.([]interface{}); ok {
				rows = append(rows, rowArr)
			}
		}
	}

	// Debug log
	fmt.Printf("Processed response: columns=%v, rows=%v\n", columns, rows)

	// Save successful query to history
	_ = s.SaveQueryHistory(query, executionTime, true, "")

	return &models.QueryResponse{
		Columns:       columns,
		Rows:          rows,
		ExecutionTime: executionTime,
		RowCount:      len(rows),
	}, nil
}

// GetDatabaseSchema retrieves the database schema from Supabase
func (s *SupabaseService) GetDatabaseSchema() (*models.SchemaResponse, error) {
	// Prepare the request to Supabase REST API
	endpoint := fmt.Sprintf("%s/rest/v1/rpc/get_schema_info", s.URL)

	// Create HTTP request
	req, err := http.NewRequest("POST", endpoint, nil)
	if err != nil {
		return nil, err
	}

	// Set headers
	req.Header.Add("apikey", s.Key)
	req.Header.Add("Authorization", "Bearer "+s.Key)
	req.Header.Add("Content-Type", "application/json")

	// Execute the request
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	// Handle error responses
	if resp.StatusCode != http.StatusOK {
		return &models.SchemaResponse{
			Error: fmt.Sprintf("Supabase error: %s", string(body)),
		}, nil
	}

	// Parse response JSON
	var result []map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}

	// Process the schema information
	tableMap := make(map[string]*models.TableInfo)

	for _, item := range result {
		tableName, ok1 := item["table_name"].(string)
		columnName, ok2 := item["column_name"].(string)
		dataType, ok3 := item["data_type"].(string)

		if !ok1 || !ok2 || !ok3 {
			continue
		}

		// Get or create table info
		table, exists := tableMap[tableName]
		if !exists {
			table = &models.TableInfo{
				Name:    tableName,
				Columns: []models.ColumnInfo{},
			}
			tableMap[tableName] = table
		}

		// Create column info
		isNullable := false
		if nullable, ok := item["is_nullable"].(string); ok {
			isNullable = nullable == "YES"
		}

		defaultValue := ""
		if defVal, ok := item["column_default"].(string); ok {
			defaultValue = defVal
		}

		maxLength := 0
		if charMaxLen, ok := item["character_maximum_length"].(float64); ok {
			maxLength = int(charMaxLen)
		}

		// Extract constraints
		constraints := []models.ConstraintInfo{}
		if constraintsData, ok := item["constraints"].([]interface{}); ok {
			for _, constraintObj := range constraintsData {
				if constraint, ok := constraintObj.(map[string]interface{}); ok {
					constraintName, _ := constraint["constraint_name"].(string)
					constraintType, _ := constraint["constraint_type"].(string)

					if constraintName != "" && constraintType != "" {
						constraints = append(constraints, models.ConstraintInfo{
							Name: constraintName,
							Type: constraintType,
						})
					}
				}
			}
		}

		column := models.ColumnInfo{
			Name:         columnName,
			Type:         dataType,
			Nullable:     isNullable,
			DefaultValue: defaultValue,
			Constraints:  constraints,
		}

		if maxLength > 0 {
			column.MaxLength = maxLength
		}

		table.Columns = append(table.Columns, column)
	}

	// Convert map to slice
	tables := []models.TableInfo{}
	for _, table := range tableMap {
		tables = append(tables, *table)
	}

	return &models.SchemaResponse{
		TableList: tables,
	}, nil
}

// GetQueryHistory retrieves the query execution history
func (s *SupabaseService) GetQueryHistory(limit int) ([]map[string]interface{}, error) {
	// Default limit if not specified
	if limit <= 0 {
		limit = 20
	}

	// Prepare the request to Supabase
	endpoint := fmt.Sprintf("%s/rest/v1/query_history?limit=%d&order=executed_at.desc", s.URL, limit)

	// Create HTTP request
	req, err := http.NewRequest("GET", endpoint, nil)
	if err != nil {
		return nil, err
	}

	// Set headers
	req.Header.Add("apikey", s.Key)
	req.Header.Add("Authorization", "Bearer "+s.Key)

	// Execute the request
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	// Handle error responses
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Supabase error: %s", string(body))
	}

	// Parse response JSON
	var result []map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}

	return result, nil
}
