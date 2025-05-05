import React from 'react';
import { Link } from 'react-router-dom';
import useAuthStore from '/Users/mbp/Documents/biddify/frontend/src/services/authStore.js'; // Adjust path

const Header = () => {
 // Inside Header.jsx
const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
const user = useAuthStore((state) => state.user);
const isLoading = useAuthStore((state) => state.isLoading);
const openAuthModal = useAuthStore((state) => state.openAuthModal);
const logout = useAuthStore((state) => state.logout);

  return (
    // Use navbar with theme colors, add subtle border or shadow
    <header className="sticky top-0 z-30 w-full border-b border-base-300 bg-base-100/80 backdrop-blur transition-shadow duration-100 [transform:translateZ(0)] shadow-sm">
      <div className="navbar max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex-1">
          <Link to="/" className="btn btn-ghost text-xl font-bold normal-case text-primary hover:bg-primary/10">
            {/* Example New Logo Name */}
            ASTONISH<span className="text-accent font-light">MART</span>
          </Link>
        </div>
        <div className="flex-none gap-3"> {/* Increased gap */}
          {isLoading && !user && (
            <span className="loading loading-spinner loading-sm mr-2 text-primary"></span>
          )}
          {!isLoading && (
            <>
              <button className="btn btn-ghost btn-sm hidden md:inline-flex">Become a Seller</button>
              {isAuthenticated && user ? (
                <div className="dropdown dropdown-end">
                  <label tabIndex={0} className="btn btn-ghost btn-circle avatar online"> {/* Added 'online' indicator */}
                    <div className="w-9 rounded-full ring-1 ring-offset-1 ring-accent"> {/* Adjusted size/ring */}
                       {user.profile_picture_url ? (
                        <img src={user.profile_picture_url} alt={user.username || 'Avatar'} />
                      ) : (
                        <span className="text-lg font-semibold text-accent-content bg-accent/30 flex items-center justify-center h-full w-full">
                          {user.username?.charAt(0).toUpperCase() || user.fullName?.charAt(0).toUpperCase() || 'A'}
                        </span>
                      )}
                    </div>
                  </label>
                  <ul tabIndex={0} className="mt-3 p-2 shadow menu menu-sm dropdown-content bg-base-100 rounded-box w-52 z-[1]"> {/* Ensure dropdown is above content */}
                    <li><Link to="/dashboard" className="justify-between">Dashboard <span className="badge badge-sm badge-info">NEW</span></Link></li>
                    <li><a>Settings</a></li>
                    <li className="mt-1 border-t border-base-300"><button onClick={logout} className="text-error">Logout</button></li>
                  </ul>
                </div>
              ) : (
                <>
                  {/* Use theme buttons with different styles */}
                  <button
                    className="btn btn-outline btn-primary btn-sm rounded-md"
                    onClick={() => openAuthModal('login')}
                  > Login </button>
                  <button
                    className="btn btn-primary btn-sm rounded-md ml-2" // Primary button for signup
                    onClick={() => openAuthModal('signup')}
                  > Sign up </button>
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