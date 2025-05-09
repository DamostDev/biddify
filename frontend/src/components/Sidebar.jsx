// src/components/layout/Sidebar.jsx
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import useAuthStore from '/Users/mbp/Documents/biddify/frontend/src/services/authStore.js';
import {
  FiHome, FiBarChart2, FiBox, FiTv, FiTrendingUp, FiFileText,
  FiDollarSign, FiGift, FiSettings, FiMessageSquare, FiChevronDown, FiChevronUp, FiHeart, FiX,
  FiPackage, FiUsers, FiAward
} from 'react-icons/fi';

const SidebarLink = ({ to, icon, text, isActive, isSubItem = false, hasSubmenu = false, isOpen = false, onLinkClick, onToggleClick }) => {
  const activeClasses = isActive ? 'bg-primary text-primary-content font-semibold' : 'hover:bg-base-content/10 text-base-content'; // Added font-semibold for active
  const paddingClass = isSubItem ? 'pl-10 pr-4' : 'pl-6 pr-4'; // Adjusted for visual depth

  const commonProps = {
    className: `flex items-center justify-between w-full py-2.5 ${paddingClass} rounded-md text-sm transition-colors duration-150 ${activeClasses}`, // Removed font-medium from here, handled by activeClasses
  };

  if (hasSubmenu) {
    return (
      <button {...commonProps} onClick={onToggleClick} aria-expanded={isOpen}>
        <div className="flex items-center">
          {icon && React.createElement(icon, { className: "w-5 h-5 mr-3 shrink-0" })}
          <span className={isActive && !isOpen ? 'font-medium' : 'font-normal'}>{text}</span> {/* Make parent medium if active but submenu closed */}
        </div>
        {isOpen ? <FiChevronUp className="w-4 h-4" /> : <FiChevronDown className="w-4 h-4" />}
      </button>
    );
  }

  return (
    <Link to={to} {...commonProps} onClick={onLinkClick}>
      <div className="flex items-center">
        {icon && React.createElement(icon, { className: "w-5 h-5 mr-3 shrink-0" })}
        <span className={isActive ? 'font-medium' : 'font-normal'}>{text}</span>
      </div>
    </Link>
  );
};


const Sidebar = () => {
  const location = useLocation();
  const isMobileMenuOpen = useAuthStore((state) => state.isMobileMenuOpen);
  const closeMobileMenu = useAuthStore((state) => state.closeMobileMenu);

  const [openSubmenus, setOpenSubmenus] = useState({});

  const handleToggleSubmenu = (name) => {
    setOpenSubmenus(prev => ({ ...prev, [name.toLowerCase()]: !prev[name.toLowerCase()] }));
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024 && isMobileMenuOpen) {
        closeMobileMenu();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobileMenuOpen, closeMobileMenu]);

  const sidebarItems = [
    { name: 'Home', to: '/dashboard', icon: FiHome, exact: true }, // Home is exact
    { name: 'Account Health', to: '/dashboard/account-health', icon: FiHeart },
    { name: 'Inventory', to: '/dashboard/inventory', icon: FiBox }, // Will be active for /dashboard/inventory/*
    {
      name: 'Shows', icon: FiTv, toPrefix: '/dashboard/shows', subItems: [
        { name: 'My Shows', to: '/dashboard/shows/my' },
        { name: 'Schedule Show', to: '/dashboard/shows/schedule' },
        { name: 'Past Shows', to: '/dashboard/shows/past' },
      ]
    },
    {
      name: 'Marketing', icon: FiTrendingUp, toPrefix: '/dashboard/marketing', subItems: [
        { name: 'Promotions', to: '/dashboard/marketing/promotions' },
        { name: 'Affiliates', to: '/dashboard/marketing/affiliates' },
      ]
    },
    { name: 'Orders', to: '/dashboard/orders', icon: FiFileText },
    { name: 'Shipments', to: '/dashboard/shipments', icon: FiPackage },
    { name: 'Tips', to: '/dashboard/tips', icon: FiGift },
    { name: 'Referrals', to: '/dashboard/referrals', icon: FiUsers },
    { name: 'Analytics', to: '/dashboard/analytics', icon: FiBarChart2 },
    { name: 'Financials', to: '/dashboard/financials', icon: FiDollarSign },
    { name: 'Rewards Club', to: '/dashboard/rewards', icon: FiAward },
  ];

  const bottomItems = [
    { name: 'Settings', to: '/dashboard/settings', icon: FiSettings },
    { name: 'Support Chat', to: '/dashboard/support', icon: FiMessageSquare },
  ];

  const handleLinkClick = () => {
    if (isMobileMenuOpen) {
      closeMobileMenu();
    }
  };

  // Function to determine if a link is active
  const checkIsActive = (itemPath, isExact = false, itemSubItems = null, itemToPrefix = null) => {
    const currentPath = location.pathname;

    if (itemSubItems) { // For parent items with submenus
      // Active if current path starts with the parent's prefix OR any sub-item's path
      return (itemToPrefix && currentPath.startsWith(itemToPrefix)) ||
             itemSubItems.some(sub => currentPath === sub.to || currentPath.startsWith(sub.to + '/'));
    }
    if (isExact) { // For items that need an exact match (like Home)
      return currentPath === itemPath;
    }
    // For other items, active if current path starts with or is exactly the item's path
    return currentPath === itemPath || currentPath.startsWith(itemPath + '/');
  };


  return (
    <>
      {/* Overlay for mobile */}
      <div
        className={`fixed inset-0 z-10 bg-black/40 backdrop-blur-sm lg:hidden transition-opacity duration-300 ease-in-out
                    ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={closeMobileMenu}
        aria-hidden="true"
      ></div>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-20 flex h-full w-64 transform flex-col border-r border-base-300 bg-base-200 shadow-xl 
                    transition-transform duration-300 ease-in-out 
                    lg:static lg:inset-0 lg:translate-x-0 lg:shadow-none 
                    ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
        aria-label="Main Sidebar"
      >
        <div className="flex h-16 items-center justify-between px-6 border-b border-base-300 shrink-0"> {/* Added shrink-0 */}
          <span className="text-lg font-semibold text-base-content">Seller Hub</span>
          <button onClick={closeMobileMenu} className="btn btn-ghost btn-sm btn-circle lg:hidden" aria-label="Close sidebar">
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-grow overflow-y-auto p-4 space-y-1">
          {sidebarItems.map((item) => (
            <React.Fragment key={item.name}>
              <SidebarLink
                to={item.subItems ? (item.toPrefix || '#') : item.to} // Use toPrefix for parent link if available
                icon={item.icon}
                text={item.name}
                isActive={checkIsActive(item.to, item.exact, item.subItems, item.toPrefix)}
                hasSubmenu={!!item.subItems}
                isOpen={!!openSubmenus[item.name.toLowerCase()]}
                onToggleClick={(e) => {
                  e.preventDefault();
                  handleToggleSubmenu(item.name);
                }}
                onLinkClick={item.subItems ? undefined : handleLinkClick}
              />
              {item.subItems && openSubmenus[item.name.toLowerCase()] && (
                <div className="ml-4 mt-1 space-y-1 border-l-2 border-primary/20 pl-2 animate-fadeIn">
                  {item.subItems.map(subItem => (
                    <SidebarLink
                      key={subItem.name}
                      to={subItem.to}
                      text={subItem.name}
                      isActive={checkIsActive(subItem.to, false)} // Sub-items are not exact by default
                      isSubItem
                      onLinkClick={handleLinkClick}
                    />
                  ))}
                </div>
              )}
            </React.Fragment>
          ))}
        </nav>

        <div className="mt-auto border-t border-base-300 p-4 space-y-1 shrink-0"> {/* Added shrink-0 */}
          {bottomItems.map((item) => (
            <SidebarLink
              key={item.name}
              to={item.to}
              icon={item.icon}
              text={item.name}
              isActive={checkIsActive(item.to, item.exact)} // Respect exact flag if present
              onLinkClick={handleLinkClick}
            />
          ))}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;