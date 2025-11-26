import { jsx as _jsx } from 'react/jsx-runtime';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from '../../../../App';
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
    _jsx(React.StrictMode, {
      children: _jsx(QueryClientProvider, {
        client: queryClient,
        children: _jsx(App, {}),
      }),
    }),
  );
}
