// src/components/PublicOnlyRoute.jsx
import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useAuthStore from '/Users/mbp/Documents/biddify/frontend/src/services/authStore.js'; 

const PublicOnlyRoute = () => {
  // Select only the state needed for the component's direct logic
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const isLoading = useAuthStore(state => state.isLoading);

  // `loadUser` is not called directly from this component's render logic or effects.
  // The initial call to `loadUser` happens when `authStore.js` is initialized.
  // So, we don't need to select `loadUser` here.

  const location = useLocation(); // Get current location, used for logging or potential future use

  // 1. Handle Loading State (Initial Auth Check from the store)
  if (isLoading) {
    // console.log("PublicOnlyRoute: isLoading is true, rendering spinner.");
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-base-200">
        <span className="loading loading-infinity loading-lg text-primary"></span>
        <p className="mt-4 text-lg text-base-content/70">Checking your session...</p>
      </div>
    );
  }

  // 2. Handle Already Authenticated State
  // If loading is finished (isLoading is false) and the user is authenticated...
  if (isAuthenticated) {
    // console.log(`PublicOnlyRoute: User is authenticated (isLoading: ${isLoading}). Redirecting to /dashboard from ${location.pathname}`);
    return <Navigate to="/dashboard" replace />; // Or to any other default authenticated route like "/"
  }

  // 3. Handle Not Authenticated State (Allow access to Login/Signup)
  // If loading is finished (isLoading is false) and the user is NOT authenticated...
  // Render the child route's component (e.g., LoginPage or SignupPage).
  // console.log(`PublicOnlyRoute: User is NOT authenticated (isLoading: ${isLoading}). Rendering Outlet for ${location.pathname}`);
  return <Outlet />;
};

export default PublicOnlyRoute;
