import { useState } from 'react'
import './App.css'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import QueryEditor from './components/QueryEditor'
import ResultDisplay, { QueryResult } from './components/ResultDisplay'

function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);

  const handleExecuteQuery = async (query: string) => {
    // Set loading state
    setIsLoading(true);
    
    try {
      // Make API call to backend
      const response = await fetch('http://localhost:8080/api/query/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Raw response data:", data);
      
      // Process the actual response from backend
      setTimeout(() => {
        if (data.error) {
          setQueryResult({
            columns: [],
            rows: [],
            error: data.error,
            executionTime: data.executionTime || 0
          });
        } else {
          // Process the actual backend response
          setQueryResult({
            columns: data.columns || [],
            rows: data.rows || [],
            message: data.error ? undefined : 'Query executed successfully',
            executionTime: data.executionTime,
            rowCount: data.rowCount
          });
        }
        setIsLoading(false);
      }, 300); // Reduced delay for better UX
    } catch (error) {
      console.error("Query execution error:", error);
      setQueryResult({
        columns: [],
        rows: [],
        error: 'Failed to connect to the server. Please try again.',
        executionTime: 0
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="app">
      <Header />
      <main className="content">
        <Sidebar />
        <div className="query-section">
          <QueryEditor onExecuteQuery={handleExecuteQuery} />
          <ResultDisplay result={queryResult} isLoading={isLoading} />
        </div>
      </main>
    </div>
  );
}

export default App
