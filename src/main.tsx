import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import '@/styles/main.scss';
import App from '@/App.tsx';
import SQLSchemaInputModal from '@/components/SQLSchemaInputModal.tsx';
import AuthGuard from '@/components/AuthGuard.tsx';
// import TransformationTester from '@/TransformationTester.tsx';
import ModalProvider from '@/components/Modal/base/ModalProvider.tsx';

// import { FormParser } from '@/dynamic-form/ReactFormParser.tsx';
// import { JSONFormStructure } from '@/dynamic-form/DynamicFormStructure.ts';import { parse, stringify } from 'yaml'

import formatCode from '@/utils/formatCode.ts';

// import { Auth0Provider } from '@auth0/auth0-react';

void (async () => {
  const formattedCode = await formatCode(`<?php

namespace App\\Models;

use App\\Models\\User;
use Illuminate\\Database\\Eloquent\\Model;
use Illuminate\\Database\\Eloquent\\Factories\\HasFactory;

class Profile extends Model
{
    use HasFactory;

    protected $table = 'profile';

    protected $primaryKey = 'profile_id';

    protected $hidden = [
        
    ];

    protected $fillable = [
        'user_id',
        'bio'
    ];

    

    

    

    public function user() {
        return $this->belongsTo(User::class);
    }

}`).php;
  // eslint-disable-next-line no-console
  console.log(formattedCode);
})();

const rootElement = document.getElementById('root');

const queryClient = new QueryClient();

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      {/* <Auth0Provider
        domain={String(import.meta.env.VITE_AUTH0_DOMAIN)}
        clientId={String(import.meta.env.VITE_AUTH0_CLIENT_ID)}
        authorizationParams={{
          redirect_uri: window.location.origin,
          audience: String(import.meta.env.VITE_AUTH0_AUDIENCE),
          scope: 'openid profile email offline_access',
        }}
        cacheLocation="localstorage"
        useRefreshTokens={true}
      > */}
      {/* <FormParser structure={JSONFormStructure} /> */}

      <QueryClientProvider client={queryClient}>
        <AuthGuard>
          <ModalProvider />
          <SQLSchemaInputModal />
          {/* <TransformationTester /> */}
          <App />
        </AuthGuard>
      </QueryClientProvider>
      {/* </Auth0Provider> */}
    </React.StrictMode>,
  );
}
