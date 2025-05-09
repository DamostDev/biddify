import React, { useState } from 'react';
import useAuthStore from '../services/authStore.js'; // Corrected path
import ProfileSettingsForm from '../components/settings/ProfileSettingsForm';
import PasswordSettingsForm from '../components/settings/PasswordSettingsForm';
import NotificationSettings from '../components/settings/NotificationSettings';
import { FiUser, FiLock, FiBell } from 'react-icons/fi';

const AccountSettingsPage = () => {
  const user = useAuthStore(state => state.user);
  const [activeTab, setActiveTab] = useState('profile');

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <span className="loading loading-dots loading-lg text-primary"></span>
      </div>
    );
  }

  const TabButton = ({ tabName, label, icon }) => (
    <button
      className={`tab tab-lg gap-2 ${activeTab === tabName ? 'tab-active font-semibold border-b-2 border-primary text-primary' : 'hover:text-primary/80'}`}
      onClick={() => setActiveTab(tabName)}
    >
      {React.createElement(icon, {className: "w-5 h-5"})}
      {label}
    </button>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfileSettingsForm currentUser={user} />;
      case 'password':
        return <PasswordSettingsForm />;
      case 'notifications':
        return <NotificationSettings />;
      default:
        return <ProfileSettingsForm currentUser={user} />;
    }
  };

  return (
    <div className="space-y-6 md:space-y-8">
      <h1 className="text-3xl font-bold text-base-content">Account Settings</h1>

      <div className="tabs tabs-bordered -mb-px border-base-300"> {/* tabs-bordered for underline effect */}
        <TabButton tabName="profile" label="Profile" icon={FiUser} />
        <TabButton tabName="password" label="Password" icon={FiLock} />
        <TabButton tabName="notifications" label="Notifications" icon={FiBell} />
      </div>

      <div className="bg-base-100 p-6 md:p-8 rounded-b-xl rounded-tr-xl shadow-lg"> {/* Adjusted rounding for tab effect */}
        {renderTabContent()}
      </div>
    </div>
  );
};

export default AccountSettingsPage;