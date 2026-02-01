import { createFileRoute, redirect, Outlet } from '@tanstack/react-router';

// Layout route for all authenticated pages
// All routes under _authenticated/ will require authentication
export const Route = createFileRoute('/_authenticated')({
  beforeLoad: ({ context, location }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({
        to: '/login',
        search: {
          redirect: location.href,
        },
      });
    }

    // Pass user to all child routes
    return { user: context.auth.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  return (
    <div className="authenticated-layout">
      <Outlet />
    </div>
  );
}
