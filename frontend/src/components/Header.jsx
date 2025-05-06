// src/components/Header.jsx

import React from 'react';
import { Link, useLocation } from 'react-router-dom'; // Import useLocation
import useAuthStore from '/Users/mbp/Documents/biddify/frontend/src/services/authStore.js'; // Adjust path
import { shallow } from 'zustand/shallow';

const Header = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const openAuthModal = useAuthStore((state) => state.openAuthModal);
  const logout = useAuthStore((state) => state.logout);

  const location = useLocation(); // Get current location
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';

  // --- Return null if on an auth page ---
  if (isAuthPage) {
    return null;
  }
  // --- Otherwise, return the normal header ---
  return (
    <header className="sticky top-0 z-30 w-full border-b border-base-300 bg-base-100/80 backdrop-blur transition-shadow duration-100 [transform:translateZ(0)] shadow-sm">
      <div className="navbar max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex-1">
          <Link to="/" className="btn btn-ghost text-xl font-bold normal-case text-primary hover:bg-primary/10">
            BIDDIFY
          </Link>
        </div>
        <div className="flex-none gap-3">
          {isLoading && !isAuthenticated && (
            <span className="loading loading-spinner loading-sm mr-2 text-primary"></span>
          )}
          {!isLoading && (
            <>
              <button className="btn btn-ghost btn-sm hidden md:inline-flex">Become a Seller</button>
              {isAuthenticated && user ? (
                <div className="dropdown dropdown-end">
                  <label tabIndex={0} className="btn btn-ghost btn-circle avatar online">
                    <div className="w-9 rounded-full ring-1 ring-offset-1 ring-accent">
                       {user.profile_picture_url ? (
                        <img src={user.profile_picture_url} alt={user.username || 'Avatar'} />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center bg-accent/30 text-lg font-semibold text-accent-content">
                          {user.username?.charAt(0).toUpperCase() || user.fullName?.charAt(0).toUpperCase() || 'A'}
                        </span>
                      )}
                    </div>
                  </label>
                  <ul tabIndex={0} className="menu dropdown-content menu-sm z-[1] mt-3 w-52 rounded-box bg-base-100 p-2 shadow">
                    <li><Link to="/dashboard" className="justify-between">Dashboard <span className="badge badge-sm badge-info">NEW</span></Link></li>
                    <li><a>Settings</a></li>
                    <li className="mt-1 border-t border-base-300"><button onClick={logout} className="w-full text-left text-error">Logout</button></li>
                  </ul>
                </div>
              ) : (
                <>
                  <Link to="/login" className="btn btn-outline btn-primary btn-sm rounded-md">
                    Login
                  </Link>
                  <Link to="/signup" className="btn btn-primary btn-sm ml-2 rounded-md">
                    Sign up
                  </Link>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;