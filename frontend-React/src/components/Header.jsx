import React from 'react';
import './Header.css';

const Header = ({ connectionStatus }) => {
  return (
    <header className="app-header">
      <div className="logo">
        <h1>SQL Interpreter</h1>
      </div>
      <div className="connection-status">
        <span className={`status-indicator ${connectionStatus}`}></span>
        <span className="status-text">
          {connectionStatus === 'connected'
            ? 'Connected to Database'
            : connectionStatus === 'disconnected'
            ? 'Disconnected'
            : 'Checking connection...'}
        </span>
      </div>
    </header>
  );
};

export default Header; 