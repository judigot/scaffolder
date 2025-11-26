import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@/styles/main.scss';
import App from './App';
import SQLSchemaInputModal from './components/SQLSchemaInputModal';
import AuthGuard from './components/AuthGuard';
// import TransformationTester from './TransformationTester';
import ModalProvider from './components/Modal/base/ModalProvider';
// import { FormParser } from './dynamic-form/ReactFormParser';
// import { JSONFormStructure } from './dynamic-form/DynamicFormStructure';import { parse, stringify } from 'yaml'
import formatCode from './utils/formatCode';
import { Auth0Provider } from '@auth0/auth0-react';
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
    _jsx(React.StrictMode, {
      children: _jsx(Auth0Provider, {
        domain: String(import.meta.env.VITE_AUTH0_DOMAIN),
        clientId: String(import.meta.env.VITE_AUTH0_CLIENT_ID),
        authorizationParams: {
          redirect_uri: window.location.origin,
          audience: String(import.meta.env.VITE_AUTH0_AUDIENCE),
          scope: 'openid profile email offline_access',
        },
        cacheLocation: 'localstorage',
        useRefreshTokens: true,
        children: _jsx(QueryClientProvider, {
          client: queryClient,
          children: _jsxs(AuthGuard, {
            children: [
              _jsx(ModalProvider, {}),
              _jsx(SQLSchemaInputModal, {}),
              _jsx(App, {}),
            ],
          }),
        }),
      }),
    }),
  );
}
