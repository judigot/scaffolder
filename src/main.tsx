import React from 'react';
import ReactDOM from 'react-dom/client';

import '@/styles/scss/main.scss';

import App from './App';
import SQLSchemaInputModal from '@/components/SQLSchemaInputModal';

const rootElement = document.getElementById('root');

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <SQLSchemaInputModal />
      <App />
    </React.StrictMode>,
  );
}
