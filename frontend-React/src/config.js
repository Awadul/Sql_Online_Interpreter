// API Endpoints
const BASE_URL = 'http://localhost:8080';

export const API_ENDPOINTS = {
  EXECUTE_QUERY: `${BASE_URL}/api/query/execute`,
  GET_SCHEMA: `${BASE_URL}/api/query/schema`,
  CONNECTION_TEST: `${BASE_URL}/api/connection/test`,
};

// Default tables for development/offline mode
// export const DEFAULT_TABLES = [
//   {
//     name: 'users',
//     columns: [
//       { name: 'id', type: 'integer', nullable: false },
//       { name: 'username', type: 'varchar', nullable: false },
//       { name: 'email', type: 'varchar', nullable: false },
//       { name: 'created_at', type: 'timestamp', nullable: true },
//     ]
//   },
//   {
//     name: 'posts',
//     columns: [
//       { name: 'id', type: 'integer', nullable: false },
//       { name: 'title', type: 'varchar', nullable: false },
//       { name: 'content', type: 'text', nullable: true },
//       { name: 'user_id', type: 'integer', nullable: false },
//       { name: 'published', type: 'boolean', nullable: false },
//       { name: 'created_at', type: 'timestamp', nullable: true },
//     ]
//   }
// ]; 