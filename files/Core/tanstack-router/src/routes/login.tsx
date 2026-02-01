import { createFileRoute, useNavigate, Link, redirect } from '@tanstack/react-router';
import { LoginForm } from '../../auth-react/src/components/LoginForm';
import { z } from 'zod';

const searchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute('/login')({
  validateSearch: searchSchema,
  beforeLoad: ({ context }) => {
    // Redirect to dashboard if already logged in
    if (context.auth.isAuthenticated) {
      throw redirect({ to: '/dashboard' });
    }
  },
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { redirect: redirectTo } = Route.useSearch();

  const handleSuccess = () => {
    navigate({ to: redirectTo || '/dashboard' });
  };

  return (
    <div className="auth-page">
      <LoginForm onSuccess={handleSuccess} />
      <p className="auth-switch">
        Don't have an account? <Link to="/register">Register</Link>
      </p>
    </div>
  );
}
