import React, { useState, useEffect } from 'react';
import './Sidebar.css';
import { API_ENDPOINTS } from '../config';
import { SchemaChangeEvent } from '../App';

const Sidebar = () => {
  const [schema, setSchema] = useState({ tables: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Function to fetch schema
  const fetchSchema = async () => {
    try {
      setLoading(true);
      const response = await fetch(API_ENDPOINTS.GET_SCHEMA);
      const data = await response.json();
      console.log("schema data", data);
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
        tables: []
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Initial fetch on component mount
  useEffect(() => {
    fetchSchema();
  }, []);
  
  // Listen for schema change events
  useEffect(() => {
    const handleSchemaChange = () => {
      console.log("Schema change detected, refreshing...");
      fetchSchema();
    };
    
    // Add event listener for schema changes
    document.addEventListener('schema-changed', handleSchemaChange);
    
    // Cleanup listener on component unmount
    return () => {
      document.removeEventListener('schema-changed', handleSchemaChange);
    };
  }, []);

  const [expandedTables, setExpandedTables] = useState({});

  const toggleTable = (tableName) => {
    setExpandedTables(prev => ({
      ...prev,
      [tableName]: !prev[tableName]
    }));
  };

  if (loading) {
    return (
      <div className="sidebar">
        <div className="sidebar-header">
          <h3>Database Schema</h3>
        </div>
        <div className="loading-schema">Loading schema...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="sidebar">
        <div className="sidebar-header">
          <h3>Database Schema</h3>
        </div>
        <div className="schema-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h3>Database Schema</h3>
        <div className="table-count">{schema.tables.length} Tables</div>
      </div>
      <div className="schema-container">
        {schema.tables.length === 0 ? (
          <div className="no-tables">No tables found in database</div>
        ) : (
          schema.tables.map(table => (
            <div key={table.name} className="table-item">
              <div 
                className="table-name" 
                onClick={() => toggleTable(table.name)}
              >
                <span 
                  className="table-icon"
                  style={{ 
                    transform: expandedTables[table.name] ? 'rotate(90deg)' : 'rotate(0deg)',
                  }}
                >
                  ▶
                </span>
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