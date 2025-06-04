import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import useAuthStore from '../services/authStore.js'; // Adjust path
import { FiMenu, FiBell, FiSearch, FiUser, FiSettings, FiLogOut, FiGrid, FiHome, FiPlayCircle } from 'react-icons/fi'; 


const Header = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const authLoading = useAuthStore((state) => state.isLoading);
  const logout = useAuthStore((state) => state.logout);
  const toggleMobileMenu = useAuthStore((state) => state.toggleMobileMenu);

  const location = useLocation();
  const navigate = useNavigate();

  const isOnDashboardPage = location.pathname.startsWith('/dashboard');

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const getUserInitials = () => {
    if (user?.username) return user.username.charAt(0).toUpperCase();
    if (user?.email) return user.email.charAt(0).toUpperCase();
    return 'U';
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const searchTerm = e.target.elements.search.value;
    if (searchTerm.trim()) {
      alert(`Search submitted for: ${searchTerm} (Search page not yet implemented)`);
      // navigate(`/search?q=${encodeURIComponent(searchTerm)}`);
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full border-b border-base-300 bg-base-100/95 backdrop-blur-md shadow-md">
      <div className="navbar mx-auto max-w-full px-3 sm:px-5 lg:px-6">
        {/* --- NAVBAR START --- */}
        <div className="navbar-start">
          {isOnDashboardPage && (
            <button
              onClick={toggleMobileMenu}
              className="btn btn-ghost btn-circle lg:hidden mr-1 text-base-content hover:bg-base-content/10"
              aria-label="Open sidebar"
            >
              <FiMenu className="w-5 h-5" />
            </button>
          )}
          <Link
            to={isOnDashboardPage ? "/dashboard" : "/"}
            className="btn btn-ghost text-xl md:text-2xl font-extrabold normal-case text-primary hover:bg-transparent hover:opacity-80 transition-opacity px-1 sm:px-2"
            title={isOnDashboardPage ? "Go to Dashboard Home" : "Go to Biddify Home"}
          >
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-secondary to-accent">
                BIDDIFY
            </span>
            {isOnDashboardPage && <span className="text-xs font-semibold text-base-content/70 ml-1.5 hidden sm:inline normal-case tracking-tight">Seller Hub</span>}
          </Link>
        </div>

        {/* --- NAVBAR CENTER (Search Bar) - MADE WIDER --- */}
        <div className="navbar-center hidden lg:flex flex-grow px-8"> {/* Increased px-8 for more space */}
          <form onSubmit={handleSearchSubmit} className="w-full"> {/* Removed max-width constraint */}
            <div className="form-control relative">
              <input
                type="text"
                name="search"
                placeholder="Search for anything..." // Generic placeholder
                className="search-bar-wide input input-bordered input-primary w-full pl-10 pr-4 py-2 h-10 text-sm focus:ring-2 focus:ring-primary/50 rounded-full shadow-sm" // Back to original height but with custom class
              />
              <button
                type="submit"
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-base-content/50 hover:text-primary focus:outline-none"
                aria-label="Submit search"
              >
                <FiSearch className="w-5 h-5" />
              </button>
            </div>
          </form>
        </div>

        {/* --- NAVBAR END (Auth & User Menu) --- */}
        <div className="navbar-end">
          {/* Mobile Search Icon (Optional - if you want search accessible on smaller screens) */}
          <button className="btn btn-ghost btn-circle md:hidden text-base-content hover:bg-base-content/10" aria-label="Search" onClick={() => alert("Mobile search UI not implemented yet")}>
            <FiSearch className="w-5 h-5" />
          </button>

          {authLoading && !isAuthenticated && (
            <span className="loading loading-spinner loading-sm mr-3 text-primary"></span>
          )}

          {!authLoading && isAuthenticated && user && (
            <>
              {/* "Start Selling" or "Create" button could be here or in user dropdown */}
              {/* Example:
              <Link to="/dashboard/inventory/create" className="btn btn-secondary btn-sm normal-case mr-2 hidden md:flex items-center gap-1.5">
                 <FiPlusSquare size={16}/> New Product
              </Link>
              */}
              <button className="btn btn-ghost btn-circle text-base-content hover:bg-base-content/10" aria-label="Notifications">
                <div className="indicator">
                  <FiBell className="w-5 h-5" />
                  {/* <span className="badge badge-xs badge-error indicator-item">3</span> */}
                </div>
              </button>
              <div className="dropdown dropdown-end ml-2">
                <label tabIndex={0} className="btn btn-ghost btn-circle avatar">
                  <div className="w-9 h-9 rounded-full ring-2 ring-accent ring-offset-base-100 ring-offset-2"> {/* Changed ring to accent */}
                    {user.profile_picture_url ? (
                      <img src={user.profile_picture_url} alt={user.username || 'Avatar'} />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center bg-accent text-accent-content text-lg font-semibold">
                        {getUserInitials()}
                      </span>
                    )}
                  </div>
                </label>
                <ul tabIndex={0} className="menu dropdown-content menu-sm z-[100] mt-3 w-60 rounded-xl bg-base-100 p-2 shadow-xl border border-base-300/50">
                  <li className="px-3 py-2">
                    <p className="text-xs text-base-content/70">Signed in as</p>
                    <p className="font-bold text-base-content truncate" title={user.username}>{user.username || user.email}</p>
                  </li>
                  <div className="divider my-1 mx-2"></div>
                  <li><Link to="/" className="py-2.5 hover:bg-base-200 rounded-md"><FiHome className="mr-2"/> Visit Biddify</Link></li>
                  <li><Link to="/dashboard" className="py-2.5 hover:bg-base-200 rounded-md"><FiGrid className="mr-2"/> Seller Dashboard</Link></li>
                  <li><Link to="/dashboard/settings" className="py-2.5 hover:bg-base-200 rounded-md"><FiSettings className="mr-2"/> Account Settings</Link></li>
                  <div className="divider my-1 mx-2"></div>
                  <li>
                    <button onClick={handleLogout} className="w-full text-left text-error hover:bg-error/10 py-2.5 flex items-center rounded-md">
                      <FiLogOut className="mr-2"/> Logout
                    </button>
                  </li>
                </ul>
              </div>
            </>
          )}
          {!authLoading && !isAuthenticated && (
             <div className="flex items-center gap-2">
                  <Link to="/login" className="btn btn-ghost btn-sm rounded-md text-base-content hover:bg-base-content/10 normal-case">
                    Log In
                  </Link>
                  <Link to="/signup" className="btn btn-primary btn-sm rounded-md normal-case shadow hover:shadow-md">
                    Sign Up
                  </Link>
                </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;