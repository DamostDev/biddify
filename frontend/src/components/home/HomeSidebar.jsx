// frontend/src/components/home/HomeSidebar.jsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import useAuthStore from '../../services/authStore';
import { FiUsers, FiCompass, FiGrid, FiSettings, FiLogOut, FiHelpCircle, FiGlobe } from 'react-icons/fi'; // Added icons

const SidebarLink = ({ to, text, isActive, icon }) => (
  <Link
    to={to}
    className={`flex items-center gap-3 py-2.5 px-4 rounded-lg text-sm transition-colors duration-150
                ${isActive
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold shadow-md scale-[1.02] transform'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium'}`}
  >
    {icon && React.createElement(icon, { className: "w-5 h-5 opacity-80" })}
    {text}
  </Link>
);

const HomeSidebar = () => {
  const { user, logout } = useAuthStore(); // Added logout
  const location = useLocation();

  if (!user) {
    return null; // Sidebar is for logged-in users
  }

  // Simplified main navigation
  const mainNavItems = [
    { name: 'For You', to: '/', icon: FiUsers }, // "For You" is typically the homepage for logged-in users
    { name: 'Following', to: '/following', icon: FiUsers }, // Kept "Following"
    { name: 'Explore Categories', to: '/categories/all', icon: FiGrid }, // Link to a dedicated page
    // { name: 'Live Now', to: '/live', icon: FiCompass}, // Optional if you want a direct "Live" link
  ];

  const footerLinks = [
    // Keep these, they are fine
    { name: 'Blog', to: '/blog' },
    { name: 'Careers', to: '/careers' },
    { name: 'About Us', to: '/about' },
    { name: 'FAQ', to: '/faq' },
    { name: 'Privacy', to: '/privacy' },
    { name: 'Terms', to: '/terms' },
    { name: 'Contact', to: '/contact' },
  ];

  const handleLogout = () => {
    logout();
    // Navigation to '/' or '/login' usually handled by ProtectedRoute or auth state listeners in App.jsx
  };

  return (
    <aside className="hidden lg:flex flex-col w-60 xl:w-64 h-screen sticky top-0 bg-white border-r border-neutral-200/80 pt-6 px-4 space-y-6 overflow-y-auto">
      <div>
        {/* User Greeting / Link to Dashboard */}
        <div className="px-2 mb-5">
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">
                Hi, {user.username || 'There'}!
            </h2>
            <Link to="/dashboard" className="text-xs text-blue-600 hover:underline">Go to Dashboard</Link>
        </div>

        <nav className="space-y-1.5"> {/* Slightly increased spacing */}
          {mainNavItems.map(item => (
            <SidebarLink
              key={item.name}
              to={item.to}
              text={item.name}
              icon={item.icon}
              isActive={
                (item.to === '/' && location.pathname === '/') ||
                (item.to !== '/' && location.pathname.startsWith(item.to))
              }
            />
          ))}
        </nav>
      </div>

      {/* Footer section in the sidebar */}
      <div className="mt-auto pt-8 pb-4 text-xs space-y-3">
        {/* Settings and Logout */}
        <div className="space-y-1 px-1">
            <SidebarLink to="/dashboard/settings" text="Settings" icon={FiSettings} isActive={location.pathname.startsWith('/dashboard/settings')} />
            <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full text-left py-2.5 px-4 rounded-lg text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium"
            >
                <FiLogOut className="w-5 h-5 opacity-80" />
                Logout
            </button>
        </div>
         <div className="pt-3 pb-1 px-1">
            <hr className="border-slate-200"/>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1.5 px-2">
          {footerLinks.map(link => (
            <Link key={link.name} to={link.to} className="text-slate-500 hover:text-blue-600 hover:underline">
              {link.name}
            </Link>
          ))}
        </div>
        <div className="px-2 mt-3">
          <button className="btn btn-xs btn-ghost text-slate-500 hover:text-slate-700 hover:bg-slate-100 normal-case gap-1.5 p-1 h-auto min-h-0 font-normal">
            <FiGlobe size={14} /> British English
          </button>
        </div>
        <p className="text-slate-400 px-2 pt-2">© {new Date().getFullYear()} Biddify Inc.</p>
      </div>
    </aside>
  );
};

export default HomeSidebar;