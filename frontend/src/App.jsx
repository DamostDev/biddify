import React from 'react';
import {  Routes, Route } from 'react-router-dom'; // Use BrowserRouter
import Header from './components/Header'; // Adjust path
import HomePage from './pages/HomePage'; // Adjust path
import LoginPage from './pages/LoginPage'; // Adjust path
import SignupPage from './pages/SignupPage'; // Adjust path
import ProtectedRoute from './components/ProtectedRoute'; // Adjust path
// import DashboardPage from './pages/DashboardPage'; // Adjust path
// import NotFoundPage from './pages/NotFoundPage'; // Adjust path
// import AuthModal from './components/AuthModal'; // We might not need this rendered here anymore

function App() {
  // Use effect to check auth status if needed, handled by ProtectedRoute usually

  return (
    // Router should be the top-level component
    <>
      {/* Apply data-theme to html or body instead, or wrap conditionally */}
      {/* Using fragment here as Router handles the main structure */}
      <>
        {/* Conditionally render Header? Maybe not on Login/Signup pages? */}
        {/* You might want a different layout for auth pages */}
        {/* Example: Render Header everywhere EXCEPT auth pages */}
        {/* {location.pathname !== '/login' && location.pathname !== '/signup' && <Header />} */}
        {/* For simplicity, let's keep it for now */}
        <Header />

        <div className="min-h-screen flex flex-col" data-theme="corporate"> {/* Keep theme */}
          <Routes>
            <Route path="/" element={<HomePage />} />

            {/* Authentication Pages */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />

            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
              {/* <Route path="/dashboard" element={<DashboardPage />} /> */}
              {/* Add other protected routes here */}
            </Route>

            {/* Optional: Not Found Page */}
            {/* <Route path="*" element={<NotFoundPage />} /> */}
          </Routes>

          {/* AuthModal is removed from here. It won't pop up automatically. */}
          {/* If you need it for other flows (e.g., password reset modal), */}
          {/* trigger it manually from specific buttons/links. */}
          {/* <AuthModal /> */}
        </div>
      </>
    </>
  );
}

export default App;