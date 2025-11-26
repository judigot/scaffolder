import { useEffect, useState } from 'react';
import clsx from 'clsx';
import './styles/app.scss';

function App() {
  const [message, setMessage] = useState<string>('Loading...');

  useEffect(() => {
    const backendHost = String(import.meta.env.VITE_BACKEND_HOST ?? '');
    const port = String(import.meta.env.VITE_BACKEND_PORT ?? '5000');
    const apiPath = String(import.meta.env.VITE_API_URL ?? 'api');
    const backendUrl = backendHost ? `${backendHost}:${port}` : '';
    const baseUrl = backendUrl ? `${backendUrl}/${apiPath}` : `/${apiPath}`;

    fetch(baseUrl,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          // Authorization: 'Basic ' + btoa('admin:123'),
        },
      },
    )
      .then((res) => res.json())
      .then((data: { message: string }) => {
        setMessage(`${data.message} - React`);
      })
      .catch(() => {
        setMessage('Backend unavailable. Make sure .env file is set correctly.');
      });
  }, []);

  return (
    <div
      className={clsx(
        'app-container',
        'flex',
        'items-center',
        'justify-center',
        'min-h-screen',
      )}
    >
      <div
        className={clsx(
          'bg-white/80',
          'rounded-3xl',
          'shadow-2xl',
          'px-10',
          'py-16',
          'dark:bg-gray-900/90',
          'dark:shadow-black/50',
        )}
      >
        <h1
          className={clsx(
            'text-5xl',
            'md:text-6xl',
            'font-extrabold',
            'text-center',
            'text-transparent',
            'bg-clip-text',
            'bg-gradient-to-r',
            'from-purple-600',
            'to-pink-500',
            'drop-shadow-lg',
            'tracking-tight',
            'dark:from-purple-300',
            'dark:to-pink-400',
          )}
        >
          {message}
        </h1>
      </div>
    </div>
  );
}

export default App;
