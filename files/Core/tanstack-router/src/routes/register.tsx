import { createFileRoute, useNavigate, Link, redirect } from '@tanstack/react-router';
import { RegisterForm } from '../../auth-react/src/components/RegisterForm';

export const Route = createFileRoute('/register')({
  beforeLoad: ({ context }) => {
    // Redirect to dashboard if already logged in
    if (context.auth.isAuthenticated) {
      throw redirect({ to: '/dashboard' });
    }
  },
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate({ to: '/dashboard' });
  };

  return (
    <div className="auth-page">
      <RegisterForm onSuccess={handleSuccess} />
      <p className="auth-switch">
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </div>
  );
}
