import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import AuthModal from './components/AuthModal';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
//import DashboardPage from './pages/DashboardPage';
import './index.css';

function App() {
  return (
    // Set theme via data-theme, let daisyUI handle base background
    <div className="min-h-screen flex flex-col" data-theme="bumblebee">
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route element={<ProtectedRoute />}>
         {/* <Route path="/dashboard" element={<DashboardPage />} /> */}
        </Route>
        {/* <Route path="*" element={<NotFoundPage />} /> */}
      </Routes>
      <AuthModal />
    </div>
  );
}
export default App;