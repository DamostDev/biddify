// src/components/layout/Header.jsx
// This is the header for the "Seller Hub" / Dashboard Layout

import React from 'react';
import { Link, useLocation } // Import useLocation
from 'react-router-dom';
import useAuthStore from '../services/authStore.js'; // Adjust path
import { FiMenu, FiBell } from 'react-icons/fi';

const Header = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const authLoading = useAuthStore((state) => state.isLoading);
  const logout = useAuthStore((state) => state.logout);
  const toggleMobileMenu = useAuthStore((state) => state.toggleMobileMenu); // For the LEFT sidebar

  const location = useLocation(); // Get current location

  // --- Determine if we are on a dashboard-like page ---
  // You might have a more sophisticated way to determine this if your routing is complex
  const isOnDashboardPage = location.pathname.startsWith('/dashboard');
  // --- End determination ---

  const handleLogout = async () => {
    await logout();
  };

  const getUserInitials = () => {
    if (user?.username) return user.username.charAt(0).toUpperCase();
    if (user?.email) return user.email.charAt(0).toUpperCase();
    return 'U';
  };

  return (
    <header className="sticky top-0 z-30 w-full border-b border-base-300 bg-base-100/90 backdrop-blur transition-shadow duration-100 [transform:translateZ(0)] shadow-sm">
      <div className="navbar mx-auto max-w-full px-4 sm:px-6 lg:px-8">
        <div className="navbar-start">
          {/* --- Hamburger button logic --- */}
          {isOnDashboardPage && ( // Only show hamburger if on a dashboard page
            <button
              onClick={toggleMobileMenu}
              className="btn btn-ghost btn-circle lg:hidden mr-2" // Hidden on large screens
              aria-label="Open sidebar"
            >
              <FiMenu className="w-5 h-5" />
            </button>
          )}
          {/* --- End hamburger button logic --- */}

          <Link 
            to={isOnDashboardPage ? "/dashboard" : "/"} // Link to dashboard if on dashboard, else home
            className="btn btn-ghost text-xl font-bold normal-case text-primary hover:bg-primary/10"
          >
            {isOnDashboardPage ? "BIDDIFY SELLER" : "BIDDIFY"} {/* Dynamic title */}
          </Link>
        </div>

        <div className="navbar-center hidden lg:flex">
          {/* Optional: Links or search for dashboard header if needed */}
        </div>

        <div className="navbar-end">
          {authLoading && !isAuthenticated && (
            <span className="loading loading-spinner loading-sm mr-3 text-primary"></span>
          )}

          {!authLoading && isAuthenticated && user && (
            <>
              <button className="btn btn-ghost btn-circle" aria-label="Notifications">
                <div className="indicator">
                  <FiBell className="w-6 h-6" />
                </div>
              </button>
              <div className="dropdown dropdown-end ml-2">
                <label tabIndex={0} className="btn btn-ghost btn-circle avatar indicator">
                  <div className="w-9 rounded-full ring-1 ring-primary ring-offset-2 ring-offset-base-100">
                    {user.profile_picture_url ? (
                      <img src={user.profile_picture_url} alt={user.username || 'Avatar'} />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center bg-neutral-focus text-lg font-semibold text-neutral-content">
                        {getUserInitials()}
                      </span>
                    )}
                  </div>
                </label>
                <ul tabIndex={0} className="menu dropdown-content menu-sm z-[100] mt-3 w-56 rounded-box bg-base-100 p-2 shadow-lg">
                  <li className="p-2 font-semibold text-sm">
                    Signed in as <br/><span className="truncate font-bold">{user.username || user.email}</span>
                  </li>
                  <div className="divider my-1"></div>
                  <li><Link to="/dashboard">Dashboard Home</Link></li>
                  <li><Link to="/profile/settings">Account Settings</Link></li>
                  <div className="divider my-1"></div>
                  <li>
                    <button onClick={handleLogout} className="w-full text-left text-error hover:bg-error/10">
                      Logout
                    </button>
                  </li>
                </ul>
              </div>
            </>
          )}
          {!authLoading && !isAuthenticated && (
             <div className="flex items-center gap-2">
                  <Link to="/login" className="btn btn-outline btn-primary btn-sm rounded-md">
                    Login
                  </Link>
                  <Link to="/signup" className="btn btn-primary btn-sm rounded-md">
                    Sign up
                  </Link>
                </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;