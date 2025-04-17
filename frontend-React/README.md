# SQL Interpreter - React Frontend

This is the React implementation of the SQL Interpreter frontend.

## Features

- **Interactive SQL Editor**: Write and execute SQL queries directly from the browser
- **Database Schema Browser**: View tables and columns in the sidebar for easy reference
- **Real-time Query Execution**: Send queries to the PostgreSQL database and view results instantly
- **Query History**: Keep track of past queries and their execution status
- **Schema Change Detection**: Automatically updates the sidebar when tables are created or dropped

## Setup and Installation

1. Make sure you have Node.js and npm installed

2. Install dependencies
```bash
npm install
```

3. Start the development server
```bash
npm run dev
```

4. Open your browser and navigate to http://localhost:5173

## Backend Configuration

This frontend expects the backend server to be running on http://localhost:8080. If your backend is running on a different URL, update the `BASE_URL` constant in `src/config.js`.
