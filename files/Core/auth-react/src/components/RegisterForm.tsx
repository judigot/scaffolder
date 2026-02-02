import { useState, type FormEvent } from 'react';
import { useAuth } from '../hooks/useAuth';

interface RegisterFormProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Registration form aligned with base.json schema
 * Only requires email, password, and optional username
 */
export function RegisterForm({ onSuccess, onError }: RegisterFormProps) {
  const { register, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    try {
      await register({
        email,
        password,
        username: username || undefined,
      });
      onSuccess?.();
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error('Registration failed');
      setError(error.message);
      onError?.(error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form register-form">
      <h2>Create Account</h2>

      {error && <div className="auth-error">{error}</div>}

      <div className="form-group">
        <label htmlFor="registerEmail">Email</label>
        <input
          id="registerEmail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          disabled={isLoading}
          placeholder="you@example.com"
        />
      </div>

      <div className="form-group">
        <label htmlFor="username">
          Username <span className="optional">(optional)</span>
        </label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          disabled={isLoading}
          placeholder="Choose a username"
        />
      </div>

      <div className="form-group">
        <label htmlFor="registerPassword">Password</label>
        <input
          id="registerPassword"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
          disabled={isLoading}
          placeholder="At least 8 characters"
        />
      </div>

      <div className="form-group">
        <label htmlFor="confirmPassword">Confirm Password</label>
        <input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          autoComplete="new-password"
          disabled={isLoading}
          placeholder="Re-enter your password"
        />
      </div>

      <button type="submit" disabled={isLoading} className="auth-button">
        {isLoading ? 'Creating account...' : 'Create Account'}
      </button>
    </form>
  );
}
