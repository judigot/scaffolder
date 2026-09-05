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
        <div className="home-authenticated">
          <p>Hello, {auth.user?.email}!</p>
          <div className="data-links">
            <h2>Your Data</h2>
            <ul>
              <li>
                <Link to="/product">Product</Link>
              </li>
              <li>
                <Link to="/customer">Customer</Link>
              </li>
              <li>
                <Link to="/order">Order</Link>
              </li>
              <li>
                <Link to="/order-product">Order Product</Link>
              </li>
              <li>
                <Link to="/user">User</Link>
              </li>
              <li>
                <Link to="/session">Session</Link>
              </li>
              <li>
                <Link to="/oauth-account">Oauth Account</Link>
              </li>
              <li>
                <Link to="/profile">Profile</Link>
              </li>
              <li>
                <Link to="/post">Posts</Link>
              </li>
              <li>
                <Link to="/user-type">User Type</Link>
              </li>
              <li>
                <Link to="/user-user-type">User User Type</Link>
              </li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="home-guest">
          <p>Please login to access your data.</p>
          <div className="auth-links">
            <Link to="/login" className="btn btn-primary">
              Login
            </Link>
            <span> or </span>
            <Link to="/register" className="btn btn-secondary">
              Register
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}