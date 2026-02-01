import { createFileRoute, Link } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/settings')({
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="settings-page">
      <h1>Settings</h1>

      <section className="settings-section">
        <h2>Account Settings</h2>
        <p>Manage your account preferences here.</p>
        {/* Add settings form components as needed */}
      </section>

      <Link to="/_authenticated/dashboard">Back to Dashboard</Link>
    </div>
  );
}
