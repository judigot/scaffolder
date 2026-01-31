import { useAuth } from '../hooks/useAuth';

interface LogoutButtonProps {
  onLogout?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export function LogoutButton({
  onLogout,
  className = 'logout-button',
  children = 'Logout',
}: LogoutButtonProps) {
  const { logout, isLoading } = useAuth();

  const handleLogout = async () => {
    await logout();
    onLogout?.();
  };

  return (
    <button onClick={handleLogout} disabled={isLoading} className={className}>
      {isLoading ? 'Logging out...' : children}
    </button>
  );
}
