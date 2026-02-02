import {
  Outlet,
  createRootRouteWithContext,
  Link,
} from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import type { AuthContextValue } from '@/types';
import { LogoutButton } from '@/components/LogoutButton';

export interface RouterContext {
  auth: AuthContextValue;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
});

function RootComponent() {
  const { auth } = Route.useRouteContext();

  return (
    <>
      <header className="app-header">
        <nav className="app-nav">
          <Link to="/" className="nav-brand"></Link>
          <div className="nav-links">
            {auth.isAuthenticated ? (
              <>
                <Link to="/product">Product</Link>
                <Link to="/customer">Customer</Link>
                <Link to="/order">Order</Link>
                <Link to="/order-product">Order Product</Link>
                <Link to="/user">User</Link>
                <Link to="/session">Session</Link>
                <Link to="/oauth-account">Oauth Account</Link>
                <Link to="/profile">Profile</Link>
                <Link to="/post">Posts</Link>
                <Link to="/user-type">User Type</Link>
                <Link to="/user-user-type">User User Type</Link>
                <LogoutButton />
              </>
            ) : (
              <>
                <Link to="/login">Login</Link>
                <Link to="/register">Register</Link>
              </>
            )}
          </div>
        </nav>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
      {import.meta.env.DEV && (
        <TanStackRouterDevtools position="bottom-right" />
      )}
    </>
  );
}
