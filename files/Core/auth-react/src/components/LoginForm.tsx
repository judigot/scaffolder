import { useState, type FormEvent } from 'react';
import { useAuth } from '../hooks/useAuth';

interface LoginFormProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function LoginForm({ onSuccess, onError }: LoginFormProps) {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      await login({ email, password });
      onSuccess?.();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Login failed');
      setError(error.message);
      onError?.(error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form login-form">
      <h2>Login</h2>

      {error && <div className="auth-error">{error}</div>}

      <div className="form-group">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          disabled={isLoading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          disabled={isLoading}
        />
      </div>

      <button type="submit" disabled={isLoading} className="auth-button">
        {isLoading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}
