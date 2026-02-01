import { createFileRoute, Link } from '@tanstack/react-router';
import { UserInfo } from '../../../auth-react/src/components';

export const Route = createFileRoute('/_authenticated/profile')({
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = Route.useRouteContext();

  return (
    <div className="profile-page">
      <h1>Profile</h1>

      <div className="profile-card">
        <UserInfo showName showEmail />

        <div className="profile-details">
          <div className="profile-field">
            <label>Username</label>
            <span>{user?.username}</span>
          </div>
          <div className="profile-field">
            <label>Email</label>
            <span>{user?.email}</span>
          </div>
          {user?.firstName && (
            <div className="profile-field">
              <label>First Name</label>
              <span>{user.firstName}</span>
            </div>
          )}
          {user?.lastName && (
            <div className="profile-field">
              <label>Last Name</label>
              <span>{user.lastName}</span>
            </div>
          )}
        </div>
      </div>

      <Link to="/_authenticated/dashboard">Back to Dashboard</Link>
    </div>
  );
}
