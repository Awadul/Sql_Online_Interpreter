import React from 'react';
import './ResultDisplay.css';

export interface QueryResult {
  columns: string[];
  rows: any[][];
  error?: string;
  message?: string;
  executionTime?: number; // in milliseconds
  rowCount?: number; // Number of rows returned
}

interface ResultDisplayProps {
  result: QueryResult | null;
  isLoading: boolean;
}

const ResultDisplay: React.FC<ResultDisplayProps> = ({ result, isLoading }) => {
  if (isLoading) {
    return (
      <div className="result-display loading">
        <div className="loading-spinner"></div>
        <p>Executing query...</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="result-display empty">
        <p>No query executed yet. Write a query and click Execute.</p>
      </div>
    );
  }

  if (result.error) {
    return (
      <div className="result-display error">
        <div className="error-header">
          <span className="error-icon">⚠️</span>
          <h3>Error</h3>
        </div>
        <pre className="error-message">{result.error}</pre>
      </div>
    );
  }

  // For debugging - log the result to console
  console.log("Query result:", result);

  return (
    <div className="result-display">
      <div className="result-header">
        <div className="result-info">
          {result.message && <span className="result-message">{result.message}</span>}
          {result.rowCount !== undefined ? (
            <span className="row-count">{result.rowCount} rows returned</span>
          ) : result.rows && (
            <span className="row-count">{result.rows.length} rows returned</span>
          )}
          {result.executionTime !== undefined && (
            <span className="execution-time">{result.executionTime} ms</span>
          )}
        </div>
      </div>

      {result.columns && result.columns.length > 0 && result.rows && result.rows.length > 0 && (
        <div className="result-table-container">
          <table className="result-table">
            <thead>
              <tr>
                {result.columns.map((column, index) => (
                  <th key={index}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {Array.isArray(row) ? (
                    // Handle array-format rows (original format)
                    row.map((cell, cellIndex) => (
                      <td key={cellIndex}>{cell === null ? <span className="null-value">NULL</span> : String(cell)}</td>
                    ))
                  ) : (
                    // Handle object-format rows (alternative format)
                    result.columns.map((column, cellIndex) => {
                      const cell = row[column] || row[Object.keys(row)[cellIndex]];
                      return (
                        <td key={cellIndex}>
                          {cell === null || cell === undefined ? 
                            <span className="null-value">NULL</span> : 
                            String(cell)
                          }
                        </td>
                      );
                    })
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {result.columns && result.columns.length > 0 && result.rows && result.rows.length === 0 && (
        <div className="no-results-message">
          <p>Query returned no results.</p>
        </div>
      )}
    </div>
  );
};

export default ResultDisplay;
