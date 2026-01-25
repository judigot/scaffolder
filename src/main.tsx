import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";

import "@/styles/main.scss";
import App from "@/AI.tsx";
import AuthGuard from "@/components/AuthGuard.tsx";
// import TransformationTester from '@/TransformationTester.tsx';
import ModalProvider from "@/components/Modal/base/ModalProvider.tsx";
import SQLSchemaInputModal from "@/components/SQLSchemaInputModal.tsx";

// import { FormParser } from '@/dynamic-form/ReactFormParser.tsx';
// import { JSONFormStructure } from '@/dynamic-form/DynamicFormStructure.ts';import { parse, stringify } from 'yaml'

import { Auth0Provider } from "@auth0/auth0-react";
import formatCode from "@/utils/formatCode.ts";

declare global {
	interface Window {
		__MOCK_AUTH__?: {
			isAuthenticated: boolean;
			isLoading: boolean;
			user: {
				sub: string;
				email: string;
				name: string;
				nickname: string;
				picture: string;
			};
			accessToken: string;
			userMetadata: Record<string, unknown>;
		};
	}
}

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
	// eslint-disable-next-line no-console
	console.log(formattedCode);
})();

const rootElement = document.getElementById("root");

const queryClient = new QueryClient();

if (rootElement) {
	ReactDOM.createRoot(rootElement).render(
		<React.StrictMode>
			<Auth0Provider
				domain={String(import.meta.env.VITE_AUTH0_DOMAIN)}
				clientId={String(import.meta.env.VITE_AUTH0_CLIENT_ID)}
				authorizationParams={{
					redirect_uri: window.location.origin,
					audience: String(import.meta.env.VITE_AUTH0_AUDIENCE),
					scope: "openid profile email offline_access",
				}}
				cacheLocation="localstorage"
				useRefreshTokens={true}
			>
				{/* <FormParser structure={JSONFormStructure} /> */}

				<QueryClientProvider client={queryClient}>
					<AuthGuard>
						<ModalProvider />
						<SQLSchemaInputModal />
						{/* <TransformationTester /> */}
						<App />
					</AuthGuard>
				</QueryClientProvider>
			</Auth0Provider>
		</React.StrictMode>,
	);
}
