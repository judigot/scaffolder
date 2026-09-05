import { createFileRoute, Link } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: HomeComponent,
});

function HomeComponent() {
  const { auth } = Route.useRouteContext();

  return (
    <div className="home-page">
      <h1>Welcome</h1>
      {auth.isAuthenticated ? (
        <div>
          <p>Hello, {auth.user?.username}!</p>
          <Link to="/dashboard">Go to Dashboard</Link>
        </div>
      ) : (
        <div>
          <p>Please login to continue</p>
          <Link to="/login">Login</Link>
          <span> or </span>
          <Link to="/register">Register</Link>
        </div>
      )}
    </div>
  );
}
