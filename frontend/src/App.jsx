// src/App.jsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ProtectedRoute from './components/ProtectedRoute';
import PublicOnlyRoute from './components/PublicOnlyRoute';
import DashboardPage from './pages/DashboardPage';
import useAuthStore from '/Users/mbp/Documents/biddify/frontend/src/services/authStore.js'; // For initial loading

function App() {
  const initialAuthLoading = useAuthStore((state) => state.isLoading);
  const initialAuthDone = useAuthStore((state) => !state.isLoading && state.user !== undefined); // A bit more specific: loading is done AND we know about user (null or object)

  // The authStore.js already calls loadUser() on initialization.
  // This check is for the very first paint of the app.
  // Once loadUser completes, initialAuthLoading will become false.
  if (initialAuthLoading && !initialAuthDone) { // Only show global loader if truly in initial indeterminate state
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-base-200" data-theme="corporate">
        <span className="loading loading-ball loading-lg text-primary"></span> {/* Different spinner example */}
        <p className="mt-4 text-xl text-base-content/80">Loading Biddify...</p>
      </div>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen flex flex-col" data-theme="corporate">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            {/* Add other protected routes here: /profile, /create-product, etc. */}
          </Route>
          {/* <Route path="*" element={<NotFoundPage />} /> */}
        </Routes>
      </div>
    </>
  );
}

export default App;