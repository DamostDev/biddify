import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  FiHome, FiBarChart2, FiBox, FiTv, FiTrendingUp, FiFileText,
  FiDollarSign, FiGift, FiSettings, FiMessageSquare, FiChevronDown, FiChevronUp, FiHeart
} from 'react-icons/fi'; // Example icons

const SidebarLink = ({ to, icon, text, isActive, isSubItem = false, hasSubmenu = false, isOpen = false, onClick }) => {
  const activeClasses = isActive
    ? 'bg-primary text-primary-content'
    : 'hover:bg-base-content/10 text-base-content';
  const paddingClass = isSubItem ? 'pl-12 pr-4' : 'pl-6 pr-4';

  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center justify-between w-full py-2.5 ${paddingClass} rounded-md text-sm font-medium transition-colors duration-150 ${activeClasses}`}
    >
      <div className="flex items-center">
        {icon && React.createElement(icon, { className: "w-5 h-5 mr-3 shrink-0" })}
        <span>{text}</span>
      </div>
      {hasSubmenu && (isOpen ? <FiChevronUp className="w-4 h-4" /> : <FiChevronDown className="w-4 h-4" />)}
    </Link>
  );
};


const Sidebar = () => {
  const location = useLocation();
  const [openSubmenus, setOpenSubmenus] = useState({}); // e.g., { shows: true }

  const toggleSubmenu = (name) => {
    setOpenSubmenus(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const sidebarItems = [
    { name: 'Home', to: '/dashboard', icon: FiHome },
    { name: 'Account Health', to: '/dashboard/account-health', icon: FiHeart }, // Placeholder
    { name: 'Inventory', to: '/dashboard/inventory', icon: FiBox },
    {
      name: 'Shows', icon: FiTv, subItems: [
        { name: 'My Shows', to: '/dashboard/shows/my' },
        { name: 'Schedule Show', to: '/dashboard/shows/schedule' },
        { name: 'Past Shows', to: '/dashboard/shows/past' },
      ]
    },
    {
      name: 'Marketing', icon: FiTrendingUp, subItems: [
        { name: 'Promotions', to: '/dashboard/marketing/promotions' },
        { name: 'Affiliates', to: '/dashboard/marketing/affiliates' },
      ]
    },
    { name: 'Orders', to: '/dashboard/orders', icon: FiFileText },
    { name: 'Shipments', to: '/dashboard/shipments', icon: FiBox }, // Could use a truck icon
    { name: 'Tips', to: '/dashboard/tips', icon: FiGift },
    { name: 'Referrals', to: '/dashboard/referrals', icon: FiGift }, // Could use FiUsers
    { name: 'Analytics', to: '/dashboard/analytics', icon: FiBarChart2 },
    { name: 'Financials', to: '/dashboard/financials', icon: FiDollarSign },
    { name: 'Rewards Club', to: '/dashboard/rewards', icon: FiGift }, // Could use FiAward
  ];

  const bottomItems = [
    { name: 'Settings', to: '/dashboard/settings', icon: FiSettings },
    { name: 'Support Chat', to: '/dashboard/support', icon: FiMessageSquare },
  ];

  return (
    <aside className="fixed inset-y-0 left-0 z-20 flex h-full w-64 transform flex-col border-r border-base-300 bg-base-200 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0"> {/* Add fixed and responsive classes */}
      {/* Sidebar Header - Seller Hub */}
      <div className="flex h-16 items-center justify-start px-6 border-b border-base-300">
        {/* <FiHeart className="w-6 h-6 mr-2 text-primary" /> You can add a logo here */}
        <span className="text-lg font-semibold text-base-content">Seller Hub</span>
      </div>

      {/* Navigation Links - Scrollable */}
      <nav className="flex-grow overflow-y-auto p-4 space-y-1">
        {sidebarItems.map((item) => (
          <React.Fragment key={item.name}>
            {item.subItems ? (
              <>
                <SidebarLink
                  to="#" // Or the first subitem's link if preferred
                  icon={item.icon}
                  text={item.name}
                  isActive={item.subItems.some(sub => location.pathname.startsWith(sub.to))}
                  hasSubmenu
                  isOpen={openSubmenus[item.name.toLowerCase()]}
                  onClick={(e) => { e.preventDefault(); toggleSubmenu(item.name.toLowerCase()); }}
                />
                {openSubmenus[item.name.toLowerCase()] && (
                  <div className="ml-4 mt-1 space-y-1 border-l border-base-300 pl-2">
                    {item.subItems.map(subItem => (
                      <SidebarLink
                        key={subItem.name}
                        to={subItem.to}
                        text={subItem.name}
                        isActive={location.pathname === subItem.to || location.pathname.startsWith(subItem.to + '/')}
                        isSubItem
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <SidebarLink
                to={item.to}
                icon={item.icon}
                text={item.name}
                isActive={location.pathname === item.to || location.pathname.startsWith(item.to + '/')}
              />
            )}
          </React.Fragment>
        ))}
      </nav>

      {/* Bottom Links */}
      <div className="mt-auto border-t border-base-300 p-4 space-y-1">
        {bottomItems.map((item) => (
          <SidebarLink
            key={item.name}
            to={item.to}
            icon={item.icon}
            text={item.name}
            isActive={location.pathname === item.to}
          />
        ))}
      </div>
    </aside>
  );
};

export default Sidebar;