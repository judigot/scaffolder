import { useAuth0 } from '@auth0/auth0-react';
import { type ReactNode, useEffect, useState } from 'react';

interface IAuthGuardProps {
  children: ReactNode;
}

export default function AuthGuard({ children }: IAuthGuardProps) {
  const { isAuthenticated, isLoading, error, loginWithRedirect } = useAuth0();
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowDebug(true);
    }, 5000);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-black text-white p-8">
        <div className="bg-gray-900 border border-red-900 rounded-lg p-8 max-w-md w-full shadow-2xl">
          <div className="flex items-center justify-center mb-6">
            <svg
              className="w-16 h-16 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              aria-label="Error icon"
            >
              <title>Error icon</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-center mb-4">
            Authentication Error
          </h2>
          <p className="text-gray-400 text-center mb-6 text-sm">
            {error.message}
          </p>
          <button
            type="button"
            onClick={() => {
              void loginWithRedirect();
            }}
            className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-black text-white">
        <div className="flex flex-col items-center">
          <div className="relative w-20 h-20 mb-8">
            <div className="absolute inset-0 border-4 border-gray-800 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <h2 className="text-2xl font-semibold mb-2 bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent">
            Scaffolder
          </h2>
          <p className="text-gray-500 text-sm">Authenticating...</p>
          {showDebug && (
            <div className="mt-8 px-6 py-4 bg-gray-900 border border-gray-800 rounded-lg">
              <p className="text-xs text-gray-400 mb-2 font-semibold">
                Debug Information:
              </p>
              <div className="text-xs text-gray-500 space-y-1">
                <div>
                  isLoading:{' '}
                  <span className="text-gray-300">{String(isLoading)}</span>
                </div>
                <div>
                  isAuthenticated:{' '}
                  <span className="text-gray-300">
                    {String(isAuthenticated)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    void loginWithRedirect();
    return null;
  }

  return <>{children}</>;
}
