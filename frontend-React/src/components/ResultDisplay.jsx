import React from 'react';
import './ResultDisplay.css';

const ResultDisplay = ({ result, isLoading }) => {
  if (isLoading) {
    return (
      <div className="result-container loading">
        <div className="loading-spinner"></div>
        <p className="loading-text">Executing query...</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="result-container empty">
        {/* <div className="empty-state-icon">📊</div> */}
        <p className="no-result-text">Execute a query to see results</p>
      </div>
    );
  }

  if (result.error) {
    return (
      <div className="result-container error">
        <div className="result-header">
          <h3>Error</h3>
          <div className="execution-info">
            <span className="execution-time">
              Execution time: {result.executionTime}ms
            </span>
          </div>
        </div>
        <div className="error-message">
          {result.error}
        </div>
      </div>
    );
  }

  return (
    <div className="result-container">
      <div className="result-header">
        <h3>Results</h3>
        <div className="execution-info">
          <span className="row-count">
            {result.rowCount} {result.rowCount === 1 ? 'row' : 'rows'}
          </span>
          <span className="execution-time">
            ({result.executionTime}ms)
          </span>
        </div>
      </div>
      
      <div className="result-table-wrapper">
        {result.columns && result.columns.length > 0 ? (
          <table className="result-table">
            <thead>
              <tr>
                {result.columns.map((column, index) => (
                  <th key={index}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.rows && result.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex}>
                      {cell === null 
                        ? <span className="null-value">NULL</span> 
                        : String(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="no-data">No data returned</div>
        )}
      </div>
    </div>
  );
};

export default ResultDisplay; 