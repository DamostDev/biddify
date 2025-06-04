// frontend/src/components/layout/Sidebar.jsx


import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import useAuthStore from '../services/authStore.js';

import {
  FiHome, FiBox, FiTv, FiFileText, FiSettings, FiChevronDown, FiChevronUp, FiX, FiList, FiPlusSquare
} from 'react-icons/fi'; // Removed unused icons

// SidebarLink component (same as before, ensure it's defined or imported)
const SidebarLink = ({
  to,
  icon,
  text,
  isActive,
  isSubItem = false,
  hasSubmenu = false,
  isOpen = false,
  onLinkClick,
  onToggleClick
}) => {
  const activeClasses = isActive ? 'bg-primary text-primary-content font-semibold shadow-sm' : 'hover:bg-base-content/10 text-base-content';
  const paddingClass = isSubItem ? 'pl-10 pr-3 py-2.5' : 'pl-5 pr-3 py-2.5'; // Adjusted padding slightly
  const baseClasses = `flex items-center justify-between w-full ${paddingClass} rounded-lg text-sm transition-all duration-150 ease-in-out`;

  if (hasSubmenu) {
    return (
      <button
        type="button"
        className={`${baseClasses} ${activeClasses}`}
        onClick={onToggleClick}
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3"> {/* Increased gap for icon and text */}
          {icon && React.createElement(icon, { className: "w-5 h-5 shrink-0" })}
          <span className={isActive && isOpen ? 'font-semibold' : 'font-normal'}>{text}</span>
        </div>
        {isOpen ? <FiChevronUp className="w-4 h-4 shrink-0" /> : <FiChevronDown className="w-4 h-4 shrink-0" />}
      </button>
    );
  }

  return (
    <Link
      to={to}
      className={`${baseClasses} ${activeClasses}`}
      onClick={onLinkClick}
    >
      <div className="flex items-center gap-3"> {/* Increased gap */}
        {icon && React.createElement(icon, { className: "w-5 h-5 shrink-0" })}
        <span className={isActive ? 'font-semibold' : 'font-normal'}>{text}</span>
      </div>
    </Link>
  );
};


// Define these outside the component for stability
const sidebarItemsDefinition = [
    { name: 'Dashboard Home', to: '/dashboard', icon: FiHome, exact: true },
    { name: 'Inventory', to: '/dashboard/inventory', icon: FiBox, toPrefix:'/dashboard/inventory' },
    {
      name: 'My Streams', // Renamed from "Shows" for clarity if it's about user's streams
      icon: FiTv,
      toPrefix: '/dashboard/streams', // Changed to /streams to match routes
      subItems: [
        { name: 'View Streams', to: '/dashboard/streams', icon: FiList, exact: true },
        { name: 'Schedule Stream', to: '/dashboard/streams/create', icon: FiPlusSquare, exact: false },
      ]
    },
    { name: 'Orders', to: '/dashboard/orders', icon: FiFileText, toPrefix: '/dashboard/orders' },
  ];

const bottomItemsDefinition = [
    { name: 'Account Settings', to: '/dashboard/settings', icon: FiSettings },
    // Add a link back to the main site's homepage
    { name: 'Back to Biddify', to: '/', icon: FiHome, isExternalSiteLink: true }, // Flag for different handling if needed
];


const Sidebar = () => {
  const location = useLocation();
  const isMobileMenuOpen = useAuthStore((state) => state.isMobileMenuOpen);
  const closeMobileMenu = useAuthStore((state) => state.closeMobileMenu);
  const [openSubmenus, setOpenSubmenus] = useState({});

  useEffect(() => {
    const currentPath = location.pathname;
    const activeParent = sidebarItemsDefinition.find(item => item.subItems && currentPath.startsWith(item.toPrefix));
    if (activeParent && !openSubmenus[activeParent.name.toLowerCase()]) {
        setOpenSubmenus(prev => ({ ...prev, [activeParent.name.toLowerCase()]: true }));
    }
  }, [location.pathname]);

  const handleToggleSubmenu = (submenuName) => {
    setOpenSubmenus(prev => ({
      ...prev,
      [submenuName.toLowerCase()]: !prev[submenuName.toLowerCase()]
    }));
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

  const handleLinkClick = () => {
    if (isMobileMenuOpen) {
      closeMobileMenu();
    }
  };

  const checkIsActive = (itemPath, isExact = false, itemToPrefix = null) => {
    const currentPath = location.pathname;
    if (itemToPrefix) return currentPath.startsWith(itemToPrefix);
    if (isExact) return currentPath === itemPath;
    return currentPath === itemPath || currentPath.startsWith(itemPath + '/');
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden transition-opacity duration-300 ease-in-out
                    ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={closeMobileMenu}
        aria-hidden="true"
      ></div>
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-screen w-64 transform flex-col border-r border-base-300 bg-base-100 shadow-xl 
                    transition-transform duration-300 ease-in-out 
                    lg:sticky lg:translate-x-0 lg:shadow-md 
                    ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
        aria-label="Main Sidebar"
      >
        <div className="flex h-16 items-center justify-between px-5 border-b border-base-300 shrink-0">
          <Link to="/dashboard" className="text-lg font-bold text-primary hover:opacity-80 transition-opacity">
            Seller Hub
          </Link>
          <button onClick={closeMobileMenu} className="btn btn-ghost btn-sm btn-circle lg:hidden" aria-label="Close sidebar">
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-grow overflow-y-auto p-3 space-y-1.5"> {/* Adjusted padding & spacing */}
          {sidebarItemsDefinition.map((item) => (
            <React.Fragment key={item.name}>
              <SidebarLink
                to={item.subItems ? '#' : item.to}
                icon={item.icon}
                text={item.name}
                isActive={checkIsActive(item.to, item.exact, null, item.toPrefix)}
                hasSubmenu={!!item.subItems}
                isOpen={!!openSubmenus[item.name.toLowerCase()]}
                onToggleClick={item.subItems ? () => handleToggleSubmenu(item.name) : undefined}
                onLinkClick={!item.subItems ? handleLinkClick : undefined}
              />
              {item.subItems && openSubmenus[item.name.toLowerCase()] && (
                <div className="ml-3 mt-1 space-y-1 border-l-2 border-primary/20 pl-3 animate-fadeIn"> {/* Adjusted indent */}
                  {item.subItems.map(subItem => (
                    <SidebarLink
                      key={subItem.name}
                      to={subItem.to}
                      icon={subItem.icon}
                      text={subItem.name}
                      isActive={checkIsActive(subItem.to, subItem.exact)}
                      isSubItem
                      onLinkClick={handleLinkClick}
                    />
                  ))}
                </div>
              )}
            </React.Fragment>
          ))}
        </nav>

        <div className="mt-auto border-t border-base-300 p-3 space-y-1.5 shrink-0"> {/* Adjusted padding */}
          {bottomItemsDefinition.map((item) => (
            <SidebarLink
              key={item.name}
              to={item.to}
              icon={item.icon}
              text={item.name}
              isActive={checkIsActive(item.to, item.exact)} // Settings might need exact: true if it has no sub-routes
              onLinkClick={handleLinkClick}
            />
          ))}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;