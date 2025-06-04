// src/pages/DashboardPage.jsx
import React from 'react';
// import useAuthStore from '/Users/mbp/Documents/biddify/frontend/src/services/authStore.js'; // Not strictly needed here if content is generic
import Sidebar from '../components/Sidebar'; // The LEFT Seller Hub Sidebar
import { Outlet, Routes, Route, Navigate } from 'react-router-dom'; // For nested dashboard routes
import AccountSettingsPage from './AccountSettingsPage'; 
import InventoryPage from './dashboard/InventoryPage';
import CreateProductPage from './dashboard/CreateProductPage'; // Import
import EditProductPage from './dashboard/EditProductPage'; 

// Example placeholder components for nested routes
const DashboardHomeContent = () => (
  <div className="p-6">
    <h2 className="text-2xl font-semibold mb-4">Dashboard Overview</h2>
    <p>This is where the main dashboard content for "Home" will go. (The "Learn How to Sell" cards etc.)</p>
    {/* You would put your "LearnCard" grid and other content here */}
  </div>
);
const AccountHealthContent = () => <div className="p-6"><h2 className="text-2xl font-semibold">Account Health</h2> {/* ... */}</div>;
const InventoryContent = () => <div className="p-6"><h2 className="text-2xl font-semibold">Inventory</h2> {/* ... */}</div>;


const DashboardPage = () => {
  // const user = useAuthStore((state) => state.user); // Still useful for personalizing content

  return (
    <div className="flex min-h-screen bg-base-200/70"> {/* Overall page container for dashboard layout */}
      <Sidebar /> {/* The responsive Left Sidebar */}

      {/* Main Content Area - will take remaining space and allow scrolling */}
      <main className="flex-1 overflow-y-auto">
        {/* The Header is rendered globally in App.jsx */}
        {/* Content of the dashboard pages will be rendered here via nested routes */}
        <div className="p-4 sm:p-6 lg:p-8"> {/* Padding for the content area */}
          <Routes>
            <Route index element={<DashboardHomeContent />} /> {/* Default dashboard view */}
            <Route path="account-health" element={<AccountHealthContent />} />
            <Route path="settings" element={<AccountSettingsPage />} /> 
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="inventory/create" element={<CreateProductPage />} />
            <Route path="inventory/edit/:productId" element={<EditProductPage />} />
            <Route path="inventory/offers" element={<InventoryPage />} /> 
            {/* Define other nested routes for /dashboard/shows, /dashboard/orders, etc. */}
            {/* Example: <Route path="shows/*" element={<ShowsMainPage />} /> */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} /> {/* Fallback for unknown dashboard sub-routes */}
          </Routes>
          {/* <Outlet /> can also be used if App.jsx defines nested routes under /dashboard/* directly */}
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;