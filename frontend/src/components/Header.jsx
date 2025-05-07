// src/components/Header.jsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import useAuthStore from '/Users/mbp/Documents/biddify/frontend/src/services/authStore.js'; // Adjust path

const Header = () => {
  // Split selectors for performance
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  // isLoading for auth check might be useful to hide buttons briefly during initial load
  const isLoadingAuth = useAuthStore((state) => state.isLoading);
  const logout = useAuthStore((state) => state.logout);

  const location = useLocation();
  // Determine if on an auth page to potentially hide the header or change its content
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';

  // Optional: You might want to hide the header completely on login/signup pages
  // if (isAuthPage) {
  //   return null;
  // }

  const handleLogout = async () => {
    await logout();
    // Navigation to home/login will be handled by ProtectedRoute/PublicOnlyRoute logic
    // or by a useEffect in a component listening to isAuthenticated.
  };

  // Fallback for user initials if profile picture or username is missing
  const getUserInitials = () => {
    if (user?.username) return user.username.charAt(0).toUpperCase();
    if (user?.email) return user.email.charAt(0).toUpperCase();
    return 'U'; // Default User
  };

  return (
    <header className="sticky top-0 z-30 w-full border-b border-base-300 bg-base-100/90 backdrop-blur transition-shadow duration-100 [transform:translateZ(0)] shadow-sm">
      <div className="navbar mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"> {/* Adjusted for DaisyUI v3+ 'navbar' class */}
        <div className="navbar-start"> {/* DaisyUI v3+ */}
          <Link to="/" className="btn btn-ghost text-xl font-bold normal-case text-primary hover:bg-primary/10">
            BIDDIFY
          </Link>
        </div>

        <div className="navbar-center hidden lg:flex"> {/* Optional: Centered links */}
          <ul className="menu menu-horizontal px-1">
            <li><Link to="/streams">Live Streams</Link></li>
            <li><Link to="/products">Browse Products</Link></li>
            {/* Add more navigation links here */}
          </ul>
        </div>

        <div className="navbar-end"> {/* DaisyUI v3+ */}
          {/* Display loading indicator if auth state is still loading */}
          {isLoadingAuth && !isAuthenticated && (
            <span className="loading loading-spinner loading-sm mr-3 text-primary"></span>
          )}

          {/* Only show buttons if not loading auth, or if already authenticated */}
          {!isLoadingAuth && (
            <>
              {isAuthenticated && user ? (
                <div className="dropdown dropdown-end">
                  <label tabIndex={0} className="btn btn-ghost btn-circle avatar indicator">
                    {/* Online indicator (optional) */}
                    {/* <span className="indicator-item badge badge-success badge-xs"></span> */}
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
                    <li><Link to="/dashboard" className="justify-between">
                        Dashboard
                        {/* <span className="badge badge-sm badge-info">NEW</span> */}
                      </Link>
                    </li>
                    <li><Link to="/profile/settings">Account Settings</Link></li>
                    <li><Link to="/my-products">My Products</Link></li>
                    <div className="divider my-1"></div>
                    <li>
                      <button onClick={handleLogout} className="w-full text-left text-error hover:bg-error/10">
                        Logout
                      </button>
                    </li>
                  </ul>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link to="/login" className="btn btn-outline btn-primary btn-sm rounded-md hidden sm:inline-flex">
                    Login
                  </Link>
                  <Link to="/signup" className="btn btn-primary btn-sm rounded-md">
                    Sign up
                  </Link>
                </div>
              )}
            </>
          )}
           {/* Hamburger menu for smaller screens (if navbar-center links exist) */}
           <div className="dropdown dropdown-end lg:hidden ml-2">
            <label tabIndex={0} className="btn btn-ghost lg:hidden">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h8m-8 6h16" /></svg>
            </label>
            <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[100] p-2 shadow bg-base-100 rounded-box w-52">
              <li><Link to="/streams">Live Streams</Link></li>
              <li><Link to="/products">Browse Products</Link></li>
              {/* If not authenticated, show login/signup for mobile */}
              {!isLoadingAuth && !isAuthenticated && (
                <>
                  <div className="divider my-1"></div>
                  <li><Link to="/login">Login</Link></li>
                  <li><Link to="/signup">Sign up</Link></li>
                </>
              )}
            </ul>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;