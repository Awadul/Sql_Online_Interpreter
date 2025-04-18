﻿# SQL Interpreter

A full-stack application that allows users to write SQL queries, execute them against a Supabase PostgreSQL database, and view the results in a user-friendly interface.

![SQL Interpreter Demo]( > Project-Demo Folder)

## Features

### Core Features

- **Interactive SQL Editor**: Write and execute SQL queries directly from the browser
- **Database Schema Browser**: View tables and columns in the sidebar for easy reference
- **Real-time Query Execution**: Send queries to a PostgreSQL database and view results instantly
- **Query Validation**: Validate SQL syntax before execution
- **Table Display**: View results in a well-formatted table with proper typing

### Advanced Features

- **Protected Tables**: Configure certain tables to be protected from queries and hidden from schema view
- **Schema Change Detection**: Automatically refresh the schema browser when tables are created or dropped
- **Responsive UI**: Clean, modern interface with smooth transitions and animations
- **Query History**: Keep track of past queries and their execution status

### Upcoming Features

- **Session Management**: Isolated sessions where users can freely modify schema without affecting others
- **Schema Visualization**: Visual representation of database schema relationships
- **Dark Mode**: Toggle between light and dark themes
- **Export Options**: Export query results to CSV, JSON, or Excel formats

## Tech Stack

### Frontend

- React.js with JavaScript/TypeScript
- Pure CSS for styling with CSS variables
- Responsive design for various screen sizes
- Modern UI with Inter font and smooth transitions

### Backend

- Node.js with Express
- Supabase for PostgreSQL database
- Custom schema protection and query validation

## Installation

### Prerequisites

- Node.js and npm for frontend and backend
- Supabase account and project (with required functions set up)

### React Frontend

The main implementation is a React.js application in the `frontend-React` directory:

1. Navigate to the React frontend directory

   ```bash
   cd sql-interpreter/frontend-React
   ```

2. Install dependencies and run

   ```bash
   npm install
   npm run dev
   ```

3. Configuration: The frontend expects the backend server to be running on http://localhost:8080. If your backend is running on a different URL, update the `BASE_URL` constant in `src/config.js`.

### Backend Setup

1. Navigate to the backend directory

   ```bash
   cd ../backend
   ```

2. Create a `.env` file in the backend directory with your Supabase credentials:

   ```
   # Supabase Configuration
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_anon_key

   # Server Configuration
   PORT=8080
   ```

3. Configure protected tables in `backend/utils/supabase-request-handler.js`:

   ```javascript
   // Add tables you want to protect from queries
   const PROTECTED_TABLES = ["query_history", "system_settings"];
   ```

4. Install dependencies

   ```bash
   npm install
   ```

5. Run the backend server
   ```bash
   npm run dev
   ```

## Supabase Setup

You need to set up the following functions and tables in your Supabase project:

### 1. SQL Execution Function

This function allows executing SQL queries from the backend:

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

### 2. Schema Information Function

This function retrieves database schema information:

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

### 3. Query Validation Function

This function validates SQL syntax:

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

Create a table to track executed queries:

```sql
CREATE TABLE IF NOT EXISTS query_history (
  id SERIAL PRIMARY KEY,
  query TEXT NOT NULL,
  execution_time INTEGER,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  is_successful BOOLEAN,
  error_message TEXT
);
```

### 5. Query History Function

Function to save executed queries:

```sql
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

## Usage

1. Start the backend server (`npm run dev` in the backend directory)
2. Start the frontend development server (`npm run dev` in the frontend-React directory)
3. Open your browser and navigate to `http://localhost:5173`
4. The left sidebar displays your database schema (tables and columns)
5. Write SQL queries in the editor in the main panel
6. Click "Execute" or press Ctrl+Enter to run your query
7. View the results in the table below the editor
8. When tables are created or dropped, the schema browser automatically updates

## Project Structure

```
/
├── frontend-React/          # React frontend application
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── App.jsx          # Main application component
│   │   ├── config.js        # Configuration including API endpoints
│   │   └── ...
│   ├── package.json         # Frontend dependencies
│   └── ...
│
└── backend/                 # Node.js/Express backend application
    ├── routes/              # API route definitions
    ├── services/            # Business logic services
    ├── utils/               # Utility functions including table protection
    ├── app.js               # Application entry point
    ├── .env                 # Environment variables (create this file)
    └── ...
```

## API Endpoints

The backend exposes the following API endpoints:

- `POST /api/query/execute` - Execute an SQL query
- `GET /api/query/schema` - Get database schema information
- `GET /api/connection/test` - Test connection to the database

## Security Features

- **Protected Tables**: Configured tables are hidden from the schema view and protected from any SQL operations
- **Schema Change Detection**: The application detects when a schema-changing operation occurs
- **Upcoming Session Isolation**: Each user will have an isolated session with a temporary schema to experiment with

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Supabase](https://supabase.io/) for the PostgreSQL database
- [Express](https://expressjs.com/) for the Node.js web framework
- [React](https://reactjs.org/) for the frontend library
