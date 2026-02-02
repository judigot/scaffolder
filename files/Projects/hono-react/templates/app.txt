import { RouterProvider } from '@tanstack/react-router';
import { router } from './router';
import { AuthProvider, useAuth } from './context/AuthContext';

function InnerApp() {
  const auth = useAuth();
  return <RouterProvider router={router} context={{ auth }} />;
}

function App() {
  return (
    <AuthProvider>
      <InnerApp />
    </AuthProvider>
  );
}

export default App;
