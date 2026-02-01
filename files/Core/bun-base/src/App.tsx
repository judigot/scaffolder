import { useEffect, useState } from 'react';
import { createClient } from '@api/index';

// Create typed API client
const api = createClient(window.location.origin);

function App() {
  const [health, setHealth] = useState<{ status: string; timestamp: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check API health on mount
    api.health.$get()
      .then(res => res.json())
      .then(setHealth)
      .catch(err => setError(err.message));
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>[PROJECT_NAME]</h1>
        <p>Hono + React + Drizzle</p>
      </header>

      <main className="app-main">
        {error ? (
          <div className="error">
            <p>Error connecting to API: {error}</p>
          </div>
        ) : health ? (
          <div className="health-status">
            <p>API Status: <strong>{health.status}</strong></p>
            <p>Last checked: {new Date(health.timestamp).toLocaleString()}</p>
          </div>
        ) : (
          <p>Loading...</p>
        )}
      </main>
    </div>
  );
}

export default App;
