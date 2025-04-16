package models

// QueryRequest represents a request to execute an SQL query
type QueryRequest struct {
	Query string `json:"query"`
}

// QueryResponse represents the response from executing an SQL query
type QueryResponse struct {
	Columns       []string        `json:"columns"`
	Rows          [][]interface{} `json:"rows"`
	Error         string          `json:"error,omitempty"`
	ExecutionTime int64           `json:"executionTime"`
	RowCount      int             `json:"rowCount"`
}

// SchemaResponse represents the database schema information
type SchemaResponse struct {
	TableList []TableInfo `json:"tableList,omitempty"`
	Error     string      `json:"error,omitempty"`
}

// TableInfo represents information about a database table
type TableInfo struct {
	Name    string       `json:"name"`
	Columns []ColumnInfo `json:"columns"`
}

// ConstraintInfo represents a database constraint
type ConstraintInfo struct {
	Name string `json:"name"`
	Type string `json:"type"`
}

// ColumnInfo represents information about a table column
type ColumnInfo struct {
	Name         string           `json:"name"`
	Type         string           `json:"type"`
	Nullable     bool             `json:"nullable"`
	DefaultValue string           `json:"defaultValue,omitempty"`
	MaxLength    int              `json:"maxLength,omitempty"`
	Constraints  []ConstraintInfo `json:"constraints,omitempty"`
}
