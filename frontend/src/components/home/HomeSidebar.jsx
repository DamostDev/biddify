// src/components/home/HomeSidebar.jsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import useAuthStore from '../../services/authStore';
import { FiGlobe } from 'react-icons/fi';

const SidebarLink = ({ to, text, isActive }) => (
  <Link
    to={to}
    className={`block py-2.5 px-3.5 rounded-lg text-[14px] transition-colors duration-150
                ${isActive
                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                  : 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 font-medium'}`}
  >
    {text}
  </Link>
);

const HomeSidebar = () => {
  const user = useAuthStore(state => state.user);
  const location = useLocation();

  const mainNavItems = [
    { name: 'For You', to: '/' },
    { name: 'Sports Cards', to: '/category/sports-cards' },
    { name: 'Trading Card Games', to: '/category/tcg' },
    { name: 'Sneakers', to: '/category/sneakers' },
    { name: 'Comics & Manga', to: '/category/comics' },
    { name: 'Vintage Clothing', to: '/category/vintage-clothing' },
    { name: 'Funko Pops', to: '/category/funko' },
    { name: 'Luxury Bags', to: '/category/luxury-bags' },
  ];

  const footerLinks = [
    { name: 'Blog', to: '/blog' }, { name: 'Careers', to: '/careers' },
    { name: 'About Us', to: '/about' }, { name: 'FAQ', to: '/faq' },
    { name: 'Whatnot Affiliates', to: '/affiliates' }, { name: 'Privacy', to: '/privacy' },
    { name: 'Terms', to: '/terms' }, { name: 'Contact', to: '/contact' },
  ];

  if (!user) return null; // Or some other UI if sidebar structure is always present

  return (
    <aside className="hidden lg:flex flex-col w-56 xl:w-60 h-screen sticky top-0 bg-white border-r border-neutral-200/80 pt-5 px-2.5 space-y-5 overflow-y-auto">
      <div>
        <h2 className="text-[19px] font-bold text-neutral-800 mb-3.5 px-3 pt-1">
          Hi {user.username}!
        </h2>
        <nav className="space-y-0.5">
          {mainNavItems.map(item => (
            <SidebarLink
              key={item.name}
              to={item.to}
              text={item.name}
              isActive={
                (item.to === '/' && location.pathname === '/') ||
                (item.to !== '/' && location.pathname.startsWith(item.to))
              }
            />
          ))}
          {/* Divider */}
          <div className="pt-2.5 pb-1.5 px-3.5">
            <hr className="border-neutral-200/70"/>
          </div>
           {/* Example of other links, not in screenshot but common */}
          <SidebarLink to="/following" text="Following" isActive={location.pathname.startsWith('/following')} />
          <SidebarLink to="/explore" text="Explore Categories" isActive={location.pathname.startsWith('/explore')} />
        </nav>
      </div>

      <div className="mt-auto pt-6 pb-3 text-[11px] space-y-2.5">
        <div className="flex flex-wrap gap-x-2.5 gap-y-1 px-3">
          {footerLinks.map(link => (
            <Link key={link.name} to={link.to} className="text-neutral-500 hover:text-neutral-700 hover:underline">
              {link.name}
            </Link>
          ))}
        </div>
        <div className="px-3 mt-2.5">
          <button className="btn btn-xs btn-ghost text-neutral-500 hover:text-neutral-600 normal-case gap-1 p-0 h-auto min-h-0 font-normal">
            <FiGlobe size={13} /> British English
          </button>
        </div>
        <p className="text-neutral-400 px-3 pt-1.5">© {new Date().getFullYear()} Biddify Inc.</p>
      </div>
    </aside>
  );
};

export default HomeSidebar;