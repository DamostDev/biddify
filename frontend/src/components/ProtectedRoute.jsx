import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useAuthStore from '/Users/mbp/Documents/biddify/frontend/src/services/authStore.js'; // Adjust path to your Zustand store if needed

const ProtectedRoute = () => {
  // Select the necessary state from the Zustand store
  // Using a selector can be slightly more performant if the store grows
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const isLoading = useAuthStore(state => state.isLoading);

  const location = useLocation(); // Get the current location the user tried to access

  // 1. Handle Loading State
  // While the store is checking the initial authentication status (isLoading is true),
  // display a loading indicator. This prevents redirecting before auth status is known.
  if (isLoading) {
    return (
        <div className="min-h-screen flex items-center justify-center">
            {/* Use a daisyUI spinner */}
            <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
    );
  }

  // 2. Handle Not Authenticated State
  // If loading is finished and the user is *not* authenticated...
  if (!isAuthenticated) {
    // Redirect them to the home page ('/').
    // We replace the current entry in the history stack so the user doesn't navigate
    // back to the protected route after being redirected.
    // We also pass the location they were trying to access in the state.
    // The login function *could* potentially use this to redirect back after successful login,
    // though in our modal setup, we usually just redirect to a default page like dashboard.
    console.log("ProtectedRoute: Not authenticated, redirecting from", location.pathname);
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // 3. Handle Authenticated State
  // If loading is finished and the user *is* authenticated...
  // Render the child route's component using the <Outlet /> component.
  // <Outlet /> is a placeholder provided by react-router-dom v6+ that renders
  // the matched nested route defined within App.jsx (e.g., <DashboardPage />).
  return <Outlet />;
};

export default ProtectedRoute;