import { QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import ReactDOM from 'react-dom/client';

import '@/styles/main.scss';
import ChatApp from '@/components/AI/chat-app/ChatApp.tsx';
// import App from "@/App.tsx";
import AuthGuard from '@/components/AuthGuard.tsx';
// import TransformationTester from '@/TransformationTester.tsx';
import ModalProvider from '@/components/Modal/base/ModalProvider.tsx';
import SQLSchemaInputModal from '@/components/SQLSchemaInputModal.tsx';

// import { FormParser } from '@/dynamic-form/ReactFormParser.tsx';
// import { JSONFormStructure } from '@/dynamic-form/DynamicFormStructure.ts';import { parse, stringify } from 'yaml'

import { type AppState, Auth0Provider } from '@auth0/auth0-react';
import AuthSessionManager from '@/components/auth/AuthSessionManager.tsx';
import {
  createAppQueryClient,
  installAuthAwareFocusManager,
  installConnectivityTracking,
} from '@/lib/api/queryClient.ts';
import {
  getSavedReturnTo,
  sanitizeReturnTo,
} from '@/lib/auth/returnContext.ts';
import { revalidateSession } from '@/lib/auth/tokenManager.ts';

import formatCode from '@/utils/formatCode.ts';

void (async () => {
  const formatted = await formatCode(`<?php

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

}`);
  const formattedCode = formatted.php;

  console.log(formattedCode);
})();

const rootElement = document.getElementById('root');

const queryClient = createAppQueryClient();
installAuthAwareFocusManager(revalidateSession);
installConnectivityTracking();

/**
 * Restores the user's previous location after an Auth0 redirect. Drafts stay
 * in sessionStorage until the owning component consumes them (or they expire).
 */
const handleRedirectCallback = (appState?: AppState): void => {
  const target =
    sanitizeReturnTo(appState?.returnTo) ??
    getSavedReturnTo() ??
    window.location.pathname;
  window.history.replaceState({}, document.title, target);
};

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <Auth0Provider
        domain={String(import.meta.env.VITE_AUTH0_DOMAIN)}
        clientId={String(import.meta.env.VITE_AUTH0_CLIENT_ID)}
        authorizationParams={{
          redirect_uri:
            `${window.location.origin}${import.meta.env.BASE_URL}`.replace(
              /\/$/,
              '',
            ),
          audience: String(import.meta.env.VITE_AUTH0_AUDIENCE),
          scope: 'openid profile email offline_access',
        }}
        cacheLocation="localstorage"
        useRefreshTokens={true}
        onRedirectCallback={handleRedirectCallback}
      >
        {/* <FormParser structure={JSONFormStructure} /> */}

        <QueryClientProvider client={queryClient}>
          <AuthGuard>
            <AuthSessionManager>
              <ModalProvider />
              <SQLSchemaInputModal />
              {/* <TransformationTester /> */}
              <ChatApp />
            </AuthSessionManager>
          </AuthGuard>
        </QueryClientProvider>
      </Auth0Provider>
    </React.StrictMode>,
  );
}
