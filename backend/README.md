# SQL Interpreter Backend

This is the backend service for the SQL Interpreter application, built with Go and Gin. It provides API endpoints to execute SQL queries and fetch database schema information from Supabase.

## Prerequisites

- Go 1.19 or later
- Supabase account and project

## Configuration

1. Create a `.env` file in the backend directory with the following variables:

```
# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key

# Server Configuration
PORT=8080
```

Replace `your_supabase_url` and `your_supabase_anon_key` with your actual Supabase project URL and anon/public key.

## Supabase Setup

This backend requires the following PostgreSQL functions and tables to be created in your Supabase project:

### 1. Execute SQL Function

Create a new PostgreSQL function in your Supabase project called `execute_sql`:

```sql
CREATE OR REPLACE FUNCTION public.execute_sql(query text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  query_result json;
  row_count integer;
  columns_json json;
  rows_json json;
BEGIN
  BEGIN
    -- Check if query is a SELECT query
    IF NOT (lower(query) ~ '^select') THEN
      -- For non-SELECT queries, just execute and return rows affected
      EXECUTE query;
      GET DIAGNOSTICS row_count = ROW_COUNT;
      
      RETURN json_build_object(
        'columns', json_build_array('affected_rows'),
        'rows', json_build_array(json_build_array(row_count))
      );
    END IF;
    
    -- For SELECT queries
    EXECUTE 'SELECT json_agg(t) FROM (' || query || ') t' INTO query_result;
    
    -- If no rows returned, create empty structure
    IF query_result IS NULL THEN
      -- Try to get column names by selecting nothing
      BEGIN
        EXECUTE 'SELECT json_agg(c) FROM (
          SELECT column_name FROM information_schema.columns
          WHERE table_name = (
            SELECT tablename FROM pg_catalog.pg_tables 
            WHERE schemaname = ''public'' 
            ORDER BY tablename LIMIT 1
          )
        ) c' INTO columns_json;
        
        RETURN json_build_object(
          'columns', columns_json,
          'rows', '[]'::json
        );
      EXCEPTION WHEN OTHERS THEN
        -- If that fails, return empty response
        RETURN json_build_object(
          'columns', '[]'::json,
          'rows', '[]'::json
        );
      END;
    END IF;
    
    -- Extract column names from first row
    SELECT json_agg(key) INTO columns_json
    FROM json_object_keys(query_result->0) key;
    
    -- Transform rows to arrays of values
    SELECT json_agg(
      (SELECT json_agg(value) FROM json_each_text(row))
    ) INTO rows_json
    FROM json_array_elements(query_result) row;
    
    RETURN json_build_object(
      'columns', columns_json,
      'rows', rows_json
    );
    
  EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('error', SQLERRM);
  END;
END;
$$;
```

### 2. Get Schema Info Function

Create a new PostgreSQL function in your Supabase project called `get_schema_info`:

```sql
CREATE OR REPLACE FUNCTION public.get_schema_info()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN (
    SELECT json_agg(
      json_build_object(
        'table_name', tables.table_name,
        'column_name', cols.column_name,
        'data_type', cols.data_type,
        'is_nullable', cols.is_nullable,
        'column_default', cols.column_default,
        'character_maximum_length', cols.character_maximum_length,
        'constraints', (
          SELECT json_agg(json_build_object(
            'constraint_name', tc.constraint_name,
            'constraint_type', tc.constraint_type
          ))
          FROM information_schema.table_constraints tc
          WHERE tc.table_name = tables.table_name AND tc.table_schema = 'public'
        )
      )
    )
    FROM information_schema.tables tables
    JOIN information_schema.columns cols ON tables.table_name = cols.table_name
    WHERE tables.table_schema = 'public'
    AND tables.table_type = 'BASE TABLE'
  );
END;
$$;
```

### 3. Validate Query Function

Create a new PostgreSQL function in your Supabase project called `validate_query`:

```sql
CREATE OR REPLACE FUNCTION public.validate_query(query text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN json_build_object('valid', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'valid', false,
    'error', SQLERRM
  );
END;
$$;
```

### 4. Query History Table

Create a new table and function to save query history:

```sql
CREATE TABLE IF NOT EXISTS query_history (
  id SERIAL PRIMARY KEY,
  query TEXT NOT NULL,
  execution_time INTEGER,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  is_successful BOOLEAN,
  error_message TEXT
);

CREATE OR REPLACE FUNCTION public.save_query_history(
  query TEXT,
  exec_time INTEGER,
  success BOOLEAN,
  error TEXT DEFAULT NULL
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO query_history(query, execution_time, is_successful, error_message)
  VALUES (query, exec_time, success, error);
END;
$$;
```

## Running the Backend

1. Install dependencies:

```
go mod download
```

2. Run the server:

```
go run main.go
```

The server will start on port 8080 (or the port specified in your `.env` file).

## API Endpoints

- `POST /api/query/execute` - Execute an SQL query
  - Request Body: `{ "query": "SELECT * FROM your_table" }`
  - Response: `{ "columns": ["id", "name"], "rows": [[1, "test"]], "executionTime": 42, "rowCount": 1 }`

- `GET /api/query/schema` - Get database schema information
  - Response: `{ "tableList": [{ "name": "users", "columns": [{ "name": "id", "type": "integer", "nullable": false }] }] }`

- `POST /api/query/validate` - Validate an SQL query
  - Request Body: `{ "query": "SELECT * FROM your_table" }`
  - Response: `{ "valid": true }` or `{ "valid": false, "error": "Error message" }`

- `GET /api/query/history` - Get query execution history
  - Query Parameters: `limit` (optional, default: 20)
  - Response: `{ "history": [{ "id": 1, "query": "SELECT * FROM persons", "execution_time": 42, "executed_at": "2023-01-01T00:00:00Z", "is_successful": true }] }`