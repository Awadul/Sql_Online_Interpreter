import React, { useState, useEffect } from 'react';
import './Sidebar.css';

interface Column {
  name: string;
  type: string;
  nullable: boolean;
  default_value?: string;
  max_length?: number;
}

interface Table {
  name: string;
  columns: Column[];
}

interface DatabaseSchema {
  tables: Table[];
}

interface SchemaResponse {
  tableList?: {
    name: string;
    columns: {
      name: string;
      type: string;
      nullable: boolean;
      defaultValue?: string;
      maxLength?: number;
    }[];
  }[];
  error?: string;
}

const Sidebar: React.FC = () => {
  const [schema, setSchema] = useState<DatabaseSchema>({ tables: [] });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    // Fetch schema from backend
    const fetchSchema = async () => {
      try {
        setLoading(true);
        const response = await fetch('http://localhost:8080/api/query/schema');
        const data: SchemaResponse = await response.json();
        
        if (data.error) {
          setError(data.error);
        } else if (data.tableList) {
          // Transform backend response to our schema format
          const tables = data.tableList.map(table => ({
            name: table.name,
            columns: table.columns.map(col => ({
              name: col.name,
              type: col.type,
              nullable: col.nullable,
              default_value: col.defaultValue,
              max_length: col.maxLength
            }))
          }));
          
          setSchema({ tables });
        }
      } catch (err) {
        setError('Failed to load database schema');
        console.error('Error fetching schema:', err);
        
        // Use fallback mock data for development
        setSchema({
          tables: [
            {
              name: 'users',
              columns: [
                { name: 'id', type: 'INTEGER', nullable: false },
                { name: 'username', type: 'VARCHAR(50)', nullable: false },
                { name: 'email', type: 'VARCHAR(100)', nullable: false },
                { name: 'created_at', type: 'TIMESTAMP', nullable: true }
              ]
            },
            {
              name: 'posts',
              columns: [
                { name: 'id', type: 'INTEGER', nullable: false },
                { name: 'user_id', type: 'INTEGER', nullable: false },
                { name: 'title', type: 'VARCHAR(200)', nullable: false },
                { name: 'content', type: 'TEXT', nullable: true },
                { name: 'published', type: 'BOOLEAN', nullable: false }
              ]
            }
          ]
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchSchema();
  }, []);

  const [expandedTables, setExpandedTables] = useState<{[key: string]: boolean}>({
    users: true,
    posts: false
  });

  const toggleTable = (tableName: string) => {
    setExpandedTables(prev => ({
      ...prev,
      [tableName]: !prev[tableName]
    }));
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h3>Database Schema</h3>
      </div>
      <div className="schema-container">
        {loading ? (
          <div className="loading-schema">Loading schema...</div>
        ) : error ? (
          <div className="schema-error">{error}</div>
        ) : schema.tables.length === 0 ? (
          <div className="no-tables">No tables found in database</div>
        ) : (
          schema.tables.map(table => (
            <div key={table.name} className="table-item">
              <div 
                className="table-name" 
                onClick={() => toggleTable(table.name)}
              >
                <span className="table-icon">{expandedTables[table.name] ? '▼' : '►'}</span>
                <span>{table.name}</span>
              </div>
              {expandedTables[table.name] && (
                <div className="columns-list">
                  {table.columns.map(column => (
                    <div key={`${table.name}-${column.name}`} className="column-item">
                      <span className="column-name">{column.name}</span>
                      <span className="column-type">{column.type}</span>
                      {!column.nullable && <span className="not-null-indicator">*</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Sidebar;
