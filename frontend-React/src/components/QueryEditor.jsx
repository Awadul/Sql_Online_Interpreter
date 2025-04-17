import React, { useState } from 'react';
import './QueryEditor.css';

const QueryEditor = ({ onExecuteQuery }) => {
  const [query, setQuery] = useState('SELECT * FROM users LIMIT 10;');

  const handleExecute = () => {
    onExecuteQuery(query);
  };

  const handleKeyDown = (e) => {
    // Execute on Ctrl+Enter
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleExecute();
    }
  };

  return (
    <div className="query-editor-container">
      <div className="editor-header">
        <h3>SQL Query</h3>
        <div className="editor-controls">
          <button 
            className="execute-button"
            onClick={handleExecute}
            title="Execute query (Ctrl+Enter)"
          >
            Execute
          </button>
          <div className="keyboard-shortcut">Ctrl+Enter</div>
        </div>
      </div>
      <div className="editor-area">
        <textarea
          className="code-editor"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter your SQL query here..."
          spellCheck="false"
        ></textarea>
      </div>
    </div>
  );
};

export default QueryEditor; 