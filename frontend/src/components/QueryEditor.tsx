import React, { useState } from 'react';
import './QueryEditor.css';

interface QueryEditorProps {
  onExecuteQuery: (query: string) => void;
}

const QueryEditor: React.FC<QueryEditorProps> = ({ onExecuteQuery }) => {
  const [query, setQuery] = useState<string>('');

  const handleExecute = () => {
    if (query.trim()) {
      onExecuteQuery(query);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Execute query with Ctrl+Enter or Cmd+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      handleExecute();
    }
  };

  return (
    <div className="query-editor">
      <div className="editor-header">
        <h3>SQL Query</h3>
        <div className="editor-actions">
          <button 
            className="clear-btn" 
            onClick={() => setQuery('')}
            disabled={!query}
          >
            Clear
          </button>
          <button 
            className="execute-btn" 
            onClick={handleExecute}
            disabled={!query.trim()}
          >
            Execute
          </button>
        </div>
      </div>
      <div className="editor-container">
        <textarea
          className="query-textarea"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write your SQL query here..."
          spellCheck={false}
        />
        <div className="keyboard-shortcut-info">
          Press Ctrl+Enter to execute
        </div>
      </div>
    </div>
  );
};

export default QueryEditor;
