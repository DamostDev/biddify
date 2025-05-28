import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import useAuthStore from '../../services/authStore'; // Adjust path if needed
import { FiGlobe } from 'react-icons/fi';

const SidebarLink = ({ to, text, isActive }) => (
  <Link
    to={to}
    className={`block py-2.5 px-4 rounded-lg text-sm transition-colors duration-150
                ${isActive
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold shadow-md scale-[1.02] transform' // Active link style
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium'}`}
  >
    {text}
  </Link>
);

const HomeSidebar = () => {
  const user = useAuthStore(state => state.user);
  const location = useLocation();

  // --- FULL Navigation Items ---
  const mainNavItems = [
    { name: 'For You', to: '/' },
    { name: 'Sports Cards', to: '/category/sports-cards' },
    { name: 'Trading Card Games', to: '/category/tcg' },
    { name: 'Sneakers', to: '/category/sneakers' },
    { name: 'Comics & Manga', to: '/category/comics' },
    { name: 'Vintage Clothing', to: '/category/vintage-clothing' },
    { name: 'Funko Pops', to: '/category/funko' },
    { name: 'Luxury Bags', to: '/category/luxury-bags' },
    { name: 'Action Figures', to: '/category/action-figures'},
    { name: 'Designer Toys', to: '/category/designer-toys'},
    // Add more categories as needed, or fetch these dynamically
  ];

  const footerLinks = [
    { name: 'Blog', to: '/blog' },
    { name: 'Careers', to: '/careers' },
    { name: 'About Us', to: '/about' },
    { name: 'FAQ', to: '/faq' },
    { name: 'Whatnot Affiliates', to: '/affiliates' }, // Or Biddify Affiliates
    { name: 'Privacy', to: '/privacy' },
    { name: 'Terms', to: '/terms' },
    { name: 'Contact', to: '/contact' },
  ];
  // --- End FULL Navigation Items ---

  if (!user) {
    // This sidebar is typically for logged-in users.
    // If you want to show a generic sidebar for logged-out users on some pages,
    // you'd handle that logic here or in the parent component.
    return null;
  }

  return (
    <aside className="hidden lg:flex flex-col w-60 xl:w-64 h-screen sticky top-0 bg-white border-r border-neutral-200/80 pt-6 px-4 space-y-6 overflow-y-auto">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 mb-5 px-2 pt-2 tracking-tight">
          Hi {user.username || 'There'}!
        </h2>
        <nav className="space-y-1">
          {mainNavItems.map(item => (
            <SidebarLink
              key={item.name}
              to={item.to}
              text={item.name}
              isActive={ // More precise active check
                (item.to === '/' && location.pathname === '/') || // Exact match for Home ("For You")
                (item.to !== '/' && location.pathname.startsWith(item.to))
              }
            />
          ))}
          {/* Divider before secondary links */}
          <div className="pt-4 pb-2 px-1">
            <hr className="border-slate-200"/>
          </div>
          {/* Secondary navigation links */}
          <SidebarLink to="/following" text="Following" isActive={location.pathname.startsWith('/following')} />
          <SidebarLink to="/explore" text="Explore Categories" isActive={location.pathname.startsWith('/explore')} />
        </nav>
      </div>

      {/* Footer section in the sidebar */}
      <div className="mt-auto pt-8 pb-4 text-xs space-y-3">
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