// frontend/src/pages/DashboardPage.jsx
import React from 'react';
import Sidebar from '../components/Sidebar'; // Adjusted path
import { Routes, Route, Navigate } from 'react-router-dom';
import AccountSettingsPage from './AccountSettingsPage';
import InventoryPage from './dashboard/InventoryPage';
import CreateProductPage from './dashboard/CreateProductPage';
import EditProductPage from './dashboard/EditProductPage';
import CreateStreamPage from './dashboard/CreateStreamPage';
import EditStreamPage from './dashboard/EditStreamPage';
import StreamsListPage from './dashboard/StreamsListPage';
import OrdersListPage from './dashboard/OrdersListPage';
import DashboardHomeContent from './dashboard/DashboardHomeContent'; // Import the new home content



// Removed other placeholder contents as they are not implemented
// const AccountHealthContent = () => <div className="p-6"><h2 className="text-2xl font-semibold">Account Health</h2></div>;

const DashboardPage = () => {
  return (
    <div className="flex min-h-screen bg-base-200/50"> {/* Slightly lighter bg */}
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-base-100"> {/* Main content area bg */}
        {/* Header is global in App.jsx */}
        <div className="p-4 py-6 sm:p-6 lg:p-8 max-w-7xl mx-auto"> {/* Constrain width & center content */}
          <Routes>
            <Route index element={<DashboardHomeContent />} /> {/* Default dashboard view */}
            {/* <Route path="account-health" element={<AccountHealthContent />} /> // Removed for now */}
            <Route path="settings" element={<AccountSettingsPage />} />
            
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="inventory/create" element={<CreateProductPage />} />
            <Route path="inventory/edit/:productId" element={<EditProductPage />} />

            <Route path="streams" element={<StreamsListPage />} />
            <Route path="streams/create" element={<CreateStreamPage />} />
            <Route path="streams/edit/:streamId" element={<EditStreamPage />} />

            <Route path="orders" element={<OrdersListPage />} />

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;