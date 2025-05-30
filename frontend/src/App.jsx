// src/App.jsx
import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom'; // <-- IMPORT useLocation
import Header from './components/Header'; // Assuming layout folder
// import UserPanel from './components/layout/UserPanel'; // You might or might not want UserPanel on all pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ProtectedRoute from './components/ProtectedRoute';
import PublicOnlyRoute from './components/PublicOnlyRoute';
import DashboardPage from './pages/DashboardPage';
import useAuthStore from '../src/services/authStore.js'; // Ensure this path is correct
import NotFoundPage from './pages/NotFoundPage';
import StreamPage from './pages/StreamPage'; // Your StreamPage component
import MinimalStreamPage from './pages/MinimalStreamPage'; // Assuming this is your minimal stream page


function App() {
  const initialAuthLoading = useAuthStore((state) => state.isLoading);
  // Using a more direct check for initial load: if loading is true AND user is still null (initial state before loadUser resolves)
  const isTrulyInitialLoading = useAuthStore((state) => state.isLoading && state.user === null);

  const location = useLocation(); // <-- GET CURRENT LOCATION
  const isStreamPage = location.pathname.startsWith('/stream/'); // <-- CHECK IF ON STREAM PAGE

  // The authStore.js already calls loadUser() on initialization.
  if (isTrulyInitialLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-base-200" >
        <span className="loading loading-ball loading-lg text-primary"></span>
        <p className="mt-4 text-xl text-base-content/80">Loading Biddify...</p>
      </div>
    );
  }

  return (
    <>
      {/* Conditionally render Header: Hide it if on a StreamPage */}
      {!isStreamPage && <Header />}

      {/* Apply data-theme to the main container or html/body in index.html for global theming */}
      {/* The StreamPage will likely have its own dark theme (bg-black etc.) */}
      <div className={`flex flex-col min-h-screen ${isStreamPage ? 'bg-neutral-900' : 'data-theme-winter'}`}>
        {/* Removed 'data-theme' from here if StreamPage controls its own theme fully */}
        {/* main tag should wrap the Routes content */}
        <main className={`flex-grow ${isStreamPage ? '' : 'lg:pb-0 pb-14'}`}> {/* Adjust padding if Header/Footer is hidden */}
          <Routes>
            <Route path="/" element={<HomePage />} />

            <Route element={<PublicOnlyRoute />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
            </Route>

            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard/*" element={<DashboardPage />} />
              {/* Add other top-level protected routes here if any */}
            </Route>

            {/* --- STREAM PAGE ROUTE --- */}
            {/* This can be public or protected. For now, public for testing. */}
            <Route path="/stream/:streamId" element={<StreamPage />} />
            <Route path="/minimal-stream/:streamId" element={<MinimalStreamPage />} />

            {/* 
            If you want it protected:
            <Route element={<ProtectedRoute />}>
              <Route path="/stream/:streamId" element={<StreamPage />} />
            </Route>
            */}
            {/* --- END STREAM PAGE ROUTE --- */}

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
      </div>
      {/* Conditionally render UserPanel if it's meant to be global and not on stream page */}
      {/* {!isStreamPage && <UserPanel />} */}
    </>
  );
}

export default App;