import { createFileRoute, Link } from '@tanstack/react-router';
import { LogoutButton, UserInfo } from '../../../auth-react/src/components';

export const Route = createFileRoute('/_authenticated/dashboard')({
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = Route.useRouteContext();

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <h1>Dashboard</h1>
        <div className="header-actions">
          <UserInfo showName showEmail={false} />
          <LogoutButton />
        </div>
      </header>

      <main className="dashboard-content">
        <p>Welcome back, {user?.username}!</p>

        <nav className="dashboard-nav">
          <Link to="/_authenticated/profile">Profile</Link>
          <Link to="/_authenticated/settings">Settings</Link>
        </nav>
      </main>
    </div>
  );
}
