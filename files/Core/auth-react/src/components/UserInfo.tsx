import { useUser } from '../hooks/useAuth';

interface UserInfoProps {
  showEmail?: boolean;
  showName?: boolean;
  className?: string;
}

export function UserInfo({
  showEmail = true,
  showName = true,
  className = 'user-info',
}: UserInfoProps) {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return <div className={className}>Loading...</div>;
  }

  if (!user) {
    return null;
  }

  const displayName =
    user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.username;

  return (
    <div className={className}>
      {showName && <span className="user-name">{displayName}</span>}
      {showEmail && <span className="user-email">{user.email}</span>}
    </div>
  );
}
