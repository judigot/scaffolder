import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from '@/App.tsx';
import '@/styles/main.scss';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const rootElement = document.getElementById('root');

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </React.StrictMode>,
  );
}
