import React from 'react';
import ReactDOM from 'react-dom/client';

import '@/styles/scss/main.scss';
import App from '@/App.tsx';
import SQLSchemaInputModal from '@/components/SQLSchemaInputModal.tsx';
// import TransformationTester from '@/TransformationTester.tsx';
import ModalProvider from '@/components/Modal/base/ModalProvider.tsx';

// import { FormParser } from '@/dynamic-form/ReactFormParser.tsx';
// import { JSONFormStructure } from '@/dynamic-form/DynamicFormStructure.ts';

const rootElement = document.getElementById('root');

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      {/* <FormParser structure={JSONFormStructure} /> */}

      <ModalProvider />
      <SQLSchemaInputModal />
      {/* <TransformationTester /> */}
      <App />
    </React.StrictMode>,
  );
}
