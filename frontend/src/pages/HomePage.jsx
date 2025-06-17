// frontend/src/pages/HomePage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import useAuthStore from '../services/authStore';
import HomeSidebar from '../components/home/HomeSidebar';
import StreamCarousel from '../components/home/StreamCarousel';
import CategoryPreview from '../components/home/CategoryPreview';
import {
    FiZap,
    FiClock,
    FiFilm,
    FiChevronDown,
    FiPlayCircle,
    FiGift,
    FiUsers,
    FiSearch,
    FiGrid, // For Explore Categories
    FiChevronRight // For View All link
} from 'react-icons/fi';
import streamService from '../services/streamService';
import { getAllCategories } from '../services/productService';
import { format, parseISO } from 'date-fns'; // For date formatting

// TEMPORARY: Manual mapping of category names to image URLs
const categoryImageMap = {
  'Electronics': 'https://images.pexels.com/photos/577560/pexels-photo-577560.jpeg?auto=compress&cs=tinysrgb&w=600',
  'Home & Garden': 'https://images.pexels.com/photos/589/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=600',
  'Toys & Hobbies': 'https://images.pexels.com/photos/47730/the-ball-stadion-football-the-pitch-47730.jpeg?auto=compress&cs=tinysrgb&w=600',
  "Men's Clothing": 'https://images.pexels.com/photos/1639729/pexels-photo-1639729.jpeg?auto=compress&cs=tinysrgb&w=600',
  'Fashion': 'https://images.pexels.com/photos/1050244/pexels-photo-1050244.jpeg?auto=compress&cs=tinysrgb&w=600',
  'Collectibles': 'https://images.pexels.com/photos/763148/pexels-photo-763148.jpeg?auto=compress&cs=tinysrgb&w=600',
  'Sneakers & Streetwear': 'https://images.pexels.com/photos/1598505/pexels-photo-1598505.jpeg?auto=compress&cs=tinysrgb&w=600',
  'Trading Card Games (TCG)': 'https://images.pexels.com/photos/1629236/pexels-photo-1629236.jpeg?auto=compress&cs=tinysrgb&w=600',
  'Vintage Toys': 'https://images.pexels.com/photos/2085739/pexels-photo-2085739.jpeg?auto=compress&cs=tinysrgb&w=600',
  'Books, Movies & Music': 'https://images.pexels.com/photos/768125/pexels-photo-768125.jpeg?auto=compress&cs=tinysrgb&w=600',
  'Art & Crafts': 'https://images.pexels.com/photos/1269968/pexels-photo-1269968.jpeg?auto=compress&cs=tinysrgb&w=600',
  'Automotive Parts & Accessories': 'https://images.pexels.com/photos/164634/pexels-photo-164634.jpeg?auto=compress&cs=tinysrgb&w=600',
  'Health & Beauty': 'https://images.pexels.com/photos/3762464/pexels-photo-3762464.jpeg?auto=compress&cs=tinysrgb&w=600',
  'Computers & Laptops': 'https://images.pexels.com/photos/459654/pexels-photo-459654.jpeg?auto=compress&cs=tinysrgb&w=600',
  "Women's Clothing": 'https://images.pexels.com/photos/375880/pexels-photo-375880.jpeg?auto=compress&cs=tinysrgb&w=600',
  'DefaultCategory': 'https://picsum.photos/seed/defaultcat/300/180'
};


const LoggedInHomePage = () => {
  const [rawLiveStreams, setRawLiveStreams] = useState([]);
  const [rawUpcomingStreams, setRawUpcomingStreams] = useState([]); // Renamed from rawUpcomingSportsCards
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const transformStreamData = useCallback((stream) => {
    if (!stream || typeof stream.stream_id === 'undefined') {
      return null;
    }
    let formattedStartTime = null;
    if (stream.status === 'scheduled' && stream.start_time) {
      try {
        const dateObject = parseISO(stream.start_time);
        formattedStartTime = format(dateObject, 'p'); // e.g., "6:00 PM"
      } catch (e) {
        console.error("Error parsing stream.start_time:", stream.start_time, e);
        const fallbackDate = new Date(stream.start_time);
        if (!isNaN(fallbackDate)) {
            formattedStartTime = fallbackDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else {
            formattedStartTime = "Soon"; // Default to "Soon" if parsing completely fails
        }
      }
    } else if (stream.status === 'scheduled' && !stream.start_time) {
        formattedStartTime = "Soon"; // If scheduled but no start_time, show "Soon"
    }

    return {
      id: stream.stream_id,
      user: {
        username: stream.User?.username || 'N/A',
        avatarUrl: stream.User?.profile_picture_url,
      },
      title: stream.title,
      category: stream.Category?.name || 'General',
      viewerCount: stream.viewer_count,
      startTime: formattedStartTime,
      isLive: stream.status === 'live',
      thumbnailUrl: stream.thumbnail_url || `https://picsum.photos/seed/${stream.stream_id}/${stream.status === 'scheduled' ? '320/400' : '300/375'}`,
      tags: stream.tags || [],
    };
  }, []);

  useEffect(() => {
    const fetchAllData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [liveDataResult, upcomingDataResult, categoryDataResult] = await Promise.allSettled([
          streamService.getAllStreams({ status: 'live', limit: 8 }),
          streamService.getAllStreams({ status: 'scheduled', limit: 6 }), // Fetches ALL upcoming streams
          getAllCategories()
        ]);

        if (liveDataResult.status === 'fulfilled') {
          setRawLiveStreams(liveDataResult.value || []);
        } else {
          console.error("Error fetching live streams:", liveDataResult.reason);
          setError(prev => (prev ? `${prev}, ` : '') + 'Failed to load live streams.');
        }

        if (upcomingDataResult.status === 'fulfilled') {
          setRawUpcomingStreams(upcomingDataResult.value || []); // Updated state variable
        } else {
          console.error("Error fetching upcoming streams:", upcomingDataResult.reason);
           setError(prev => (prev ? `${prev}, ` : '') + 'Failed to load upcoming streams.');
        }

        if (categoryDataResult.status === 'fulfilled') {
          const fetchedCategories = categoryDataResult.value || [];
          const augmentedCategories = fetchedCategories.map(cat => ({
            ...cat,
            imageUrl: cat.image_url || categoryImageMap[cat.name] || categoryImageMap['DefaultCategory'],
            id: cat.category_id
          })).filter(cat => cat.parent_category_id === null);
          setCategories(augmentedCategories);
        } else {
          console.error("Error fetching categories:", categoryDataResult.reason);
           setError(prev => (prev ? `${prev}, ` : '') + 'Failed to load categories.');
        }

      } catch (err) {
        console.error("Critical error in fetchAllData:", err);
        setError('Failed to load homepage content. Please try refreshing.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchAllData();
  }, []); // Keep dependencies empty for single fetch on mount

  const liveStreamsForYou = !isLoading && rawLiveStreams.length > 0
    ? rawLiveStreams.slice(0, 4).map(transformStreamData).filter(Boolean)
    : [];
  const liveStreamsLiveNow = !isLoading && rawLiveStreams.length > 0
    ? rawLiveStreams.slice(4, 8).map(transformStreamData).filter(Boolean)
    : [];
  const transformedUpcomingStreams = !isLoading && rawUpcomingStreams.length > 0 // Updated variable name
    ? rawUpcomingStreams.map(transformStreamData).filter(Boolean)
    : [];

  if (isLoading) {
      return (
          <div className="flex flex-1 items-center justify-center p-10 bg-white">
              <span className="loading loading-lg loading-dots text-primary"></span>
          </div>
      );
  }

  return (
    <div className="flex flex-col lg:flex-row bg-white min-h-screen">
      <HomeSidebar />
      <main className="flex-1 overflow-y-auto bg-white py-8 px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 space-y-10 sm:space-y-12">

        {/* 1. "For You" Stream Carousel */}
        <StreamCarousel
            title="For You"
            streams={liveStreamsForYou}
            isLoading={isLoading && liveStreamsForYou.length === 0}
            icon={<FiZap className="text-red-500" />}
            viewAllLink="/foryou"
            type="live"
        />

        {/* 2. "Explore Categories" Section - MOVED HERE */}
        {categories.length > 0 && (
          <section className="py-6 sm:py-8 rounded-xl bg-gradient-to-br from-neutral-800 to-neutral-900 text-neutral-content shadow-xl">
            <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center mb-5 sm:mb-6">
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
                  <FiGrid className="text-sky-400" /> Explore Categories
                </h2>
                <Link to="/categories/all" className="text-xs sm:text-sm font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1">
                  View All <FiChevronRight />
                </Link>
              </div>
              <CategoryPreview
                  categories={categories.slice(0, 5)} // Show top 5 top-level categories
                  isLoading={isLoading && categories.length === 0}
              />
            </div>
          </section>
        )}

        {/* 3. "Live Now" Stream Carousel */}
        <StreamCarousel
            title="Live Now"
            streams={liveStreamsLiveNow}
            isLoading={isLoading && liveStreamsLiveNow.length === 0}
            icon={<FiFilm className="text-purple-500"/>}
            viewAllLink="/live"
            type="live"
        />

        {/* 4. "Upcoming Streams" (All Categories) Stream Carousel */}
        <StreamCarousel
            title="Upcoming Streams" // Changed title
            streams={transformedUpcomingStreams} // Changed data source
            isLoading={isLoading && transformedUpcomingStreams.length === 0}
            icon={<FiClock className="text-green-600"/>}
            viewAllLink="/upcoming/all" // Changed link, ensure this route/page is implemented
            type="upcoming"
        />

         {error && <p className="text-center text-sm text-error mt-4">{error}</p>}
      </main>
    </div>
  );
};

// --- Public Home Page (for logged-out users) ---
const FeatureCard = ({ icon, title, description }) => (
  <div className="card bg-base-200 shadow-xl hover:shadow-2xl transition-all duration-300 ease-in-out group transform hover:-translate-y-1">
    <figure className="px-10 pt-10">
      {React.cloneElement(icon, { className: `${icon.props.className || ''} w-12 h-12 group-hover:scale-110 group-hover:rotate-[-3deg] transition-transform duration-300` })}
    </figure>
    <div className="card-body items-center text-center">
      <h3 className="card-title text-xl font-bold mb-2 text-base-content group-hover:text-primary transition-colors">{title}</h3>
      <p className="text-base-content/80 leading-relaxed">{description}</p>
    </div>
  </div>
);

const PublicHomePage = () => (
  <div className="flex flex-col min-h-screen bg-base-100">
    <main className="flex-grow">
      <section className="relative flex flex-col items-center justify-center text-center overflow-hidden bg-gradient-to-br from-base-200 to-base-100 p-4 pt-20 md:pt-24 min-h-screen">
        <div className="absolute inset-0 opacity-5 bg-[radial-gradient(theme(colors.base-300)_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>
        <div className="relative z-[1] max-w-4xl">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent animate-[fade-in-down_0.6s_ease-out_forwards]">
            Discover Unique Finds. Live.
          </h1>
          <p className="text-lg md:text-xl text-base-content/80 mb-10 max-w-2xl mx-auto animate-[fade-in-up_0.6s_ease-out_0.2s_forwards]">
            Your premier destination for live auctions, interactive shopping, and vibrant community connection. Dive into streams and uncover treasures.
          </p>
          <Link
            to="/live"
            className="btn btn-lg btn-primary rounded-full shadow-lg hover:shadow-primary/50 hover:scale-105 active:scale-95 transition-all duration-300 ease-in-out animate-[fade-in-up_0.6s_ease-out_0.4s_forwards]"
          >
            Explore Live Streams <FiZap className="inline ml-2 h-5 w-5" />
          </Link>
        </div>
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 opacity-0 md:opacity-70 hidden md:block animate-[fade-in-up_0.6s_ease-out_0.8s_forwards]">
          <a href="#features" aria-label="Scroll to features" className="animate-bounce block p-2">
            <FiChevronDown className="w-8 h-8 text-base-content/50" />
          </a>
        </div>
      </section>
      <section id="features" className="py-16 md:py-24 bg-base-100">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-base-content">
            What Awaits You?
          </h2>
          <p className="text-center text-lg text-base-content/70 mb-12 md:mb-16 max-w-2xl mx-auto">
              Explore a dynamic marketplace buzzing with excitement, unique products, and passionate communities.
          </p>
          <div className="grid sm:grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            <FeatureCard
              icon={<FiPlayCircle className="text-primary" />}
              title="Thrilling Live Streams"
              description="Engage with sellers in real-time, ask questions, and snag exclusive deals as they happen."
            />
            <FeatureCard
              icon={<FiGift className="text-secondary" />}
              title="Discover Unique Treasures"
              description="From rare collectibles to handmade crafts and trending fashion, find items you won't see anywhere else."
            />
            <FeatureCard
              icon={<FiUsers className="text-accent" />}
              title="Vibrant Community"
              description="Connect with fellow enthusiasts, share your passion, and be part of a supportive shopping community."
            />
          </div>
        </div>
      </section>
      <section className="py-16 md:py-24 bg-gradient-to-br from-base-200 to-base-100">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-base-content">
            Ready to Dive In?
          </h2>
          <p className="text-lg md:text-xl text-base-content/80 mb-10 max-w-2xl mx-auto">
            Join thousands of users exploring, bidding, and discovering amazing products live. Your next favorite find is waiting!
          </p>
          <Link
            to="/live"
            className="btn btn-lg btn-primary rounded-full shadow-lg hover:shadow-primary/50 hover:scale-105 active:scale-95 transition-all duration-300 ease-in-out"
          >
            Explore All Streams <FiSearch className="inline ml-2 h-5 w-5" />
          </Link>
        </div>
      </section>
    </main>
    <footer className="p-6 footer footer-center bg-base-300 text-base-content">
      <aside>
        <p>Copyright © {new Date().getFullYear()} - Biddify Inc. All rights reserved.</p>
        <p className="text-xs opacity-70">Discover. Connect. Shop Live.</p>
      </aside>
    </footer>
  </div>
);

// --- Main HomePage Component (Decides which version to show) ---
const HomePage = () => {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const isLoadingAuth = useAuthStore(state => state.isLoading);

  if (isLoadingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-base-200">
        <span className="loading loading-ball loading-lg text-primary"></span>
      </div>
    );
  }
  return isAuthenticated ? <LoggedInHomePage /> : <PublicHomePage />;
};

export default HomePage;