// src/pages/HomePage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import useAuthStore from '../services/authStore';
import HomeSidebar from '../components/home/HomeSidebar';
import StreamCarousel from '../components/home/StreamCarousel';
import CategoryPreview from '../components/home/CategoryPreview';
// Updated icon imports
import { FiZap, FiClock, FiTrendingUp, FiFilm, FiPlayCircle, FiGift, FiUsers, FiSearch, FiChevronDown } from 'react-icons/fi';

// --- MOCK API Service Functions & Placeholder Data (REPLACE WITH ACTUAL) ---
const placeholderStreamData = (count = 4, type = 'live', baseSeed = 'stream') => Array(count).fill(null).map((_, i) => ({
  id: `${type}-${baseSeed}-${i}`,
  user: { username: `${type === 'upcoming' ? 'Host' : 'Streamer'}${i + Math.floor(Math.random()*100)}`, avatarUrl: `https://i.pravatar.cc/40?u=${baseSeed}er${i}` },
  title: type === 'live' ? `Live Now: Amazing Deals & Fun! Show #${i + 1}` : `Upcoming: ${baseSeed.replace('-', ' ')} Special ${i+1}`,
  category: type === 'live' ? (i % 3 === 0 ? 'Trading Cards' : (i % 3 === 1 ? 'Sneakers' : 'Vintage Toys')) : 'Collectibles',
  viewerCount: type === 'live' ? Math.floor(Math.random() * 300) + 20 : null,
  startTime: type === 'upcoming' ? `Today ${14 + i}:00` : null,
  isLive: type === 'live',
  thumbnailUrl: `https://picsum.photos/seed/${baseSeed}${i}/${type === 'upcoming' ? '320/400' : '300/375'}`,
  tags: type === 'live' ? (Math.random() > 0.5 ? ['$1 Starts'] : ['Giveaway']) : ['Exclusive'],
}));

const placeholderCategoryData = [
  { id: 'sneakers-streetwear', name: 'Sneakers & Streetwear', imageUrl: 'https://picsum.photos/seed/cat10/300/180' },
  { id: 'sneakers', name: 'Sneakers', imageUrl: 'https://picsum.photos/seed/cat11/300/180' },
  { id: 'womens-fashion', name: 'Women\'s Fashion', imageUrl: 'https://picsum.photos/seed/cat12/300/180' },
  { id: 'trading-card-games', name: 'Trading Card Games', imageUrl: 'https://picsum.photos/seed/cat13/300/180' },
  { id: 'vintage-toys', name: 'Vintage Toys', imageUrl: 'https://picsum.photos/seed/cat14/300/180' },
];

const mockApiCall = (data, delay = 700) => new Promise(resolve => setTimeout(() => resolve(data), delay));

const getLiveStreams = async ({ limit = 12 } = {}) => { /* ... mock ... */ return mockApiCall(placeholderStreamData(limit, 'live', 'liveShow')); };
const getUpcomingStreams = async ({ category = 'sports-cards', limit = 8 } = {}) => { /* ... mock ... */ return mockApiCall(placeholderStreamData(limit, 'upcoming', category)); };
const getSuggestedCategories = async () => { /* ... mock ... */ return mockApiCall(placeholderCategoryData); };
// --- END MOCK API ---


const LoggedInHomePage = () => {
  const [liveStreams, setLiveStreams] = useState([]);
  const [upcomingSportsCards, setUpcomingSportsCards] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoadingGlobal, setIsLoadingGlobal] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAllData = async () => {
      setIsLoadingGlobal(true);
      setError(null);
      try {
        const [liveData, upcomingData, categoryData] = await Promise.allSettled([
          getLiveStreams({ limit: 8 }),
          getUpcomingStreams({ category: 'sports-cards', limit: 6 }),
          getSuggestedCategories()
        ]);

        if (liveData.status === 'fulfilled') setLiveStreams(liveData.value || []);
        else console.error("Error fetching live streams:", liveData.reason);

        if (upcomingData.status === 'fulfilled') setUpcomingSportsCards(upcomingData.value || []);
        else console.error("Error fetching upcoming streams:", upcomingData.reason);

        if (categoryData.status === 'fulfilled') setCategories(categoryData.value || []);
        else console.error("Error fetching categories:", categoryData.reason);

        if ([liveData, upcomingData, categoryData].some(res => res.status === 'rejected')) {
            setError('Some content could not be loaded. Please try refreshing.');
        }

      } catch (err)
      {
        console.error("Critical error in fetchAllData:", err);
        setError('Failed to load homepage content. Please try refreshing.');
      } finally {
        setIsLoadingGlobal(false);
      }
    };
    fetchAllData();
  }, []);

  if (error && !isLoadingGlobal) {
    return <div className="flex-1 flex items-center justify-center p-4 text-error">{error}</div>;
  }

  const liveStreamsForYou = liveStreams.slice(0, 4);
  const liveStreamsLiveNow = liveStreams.slice(4, 8);

  return (
    <div className="flex flex-col lg:flex-row bg-white min-h-screen"> {/* Outer container still bg-white */}
      <HomeSidebar />
      {/* Main content area now has bg-white */}
      <main className="flex-1 overflow-y-auto bg-white py-8 px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 space-y-10 sm:space-y-12">
        <StreamCarousel
            title="For You"
            streams={liveStreamsForYou}
            isLoading={isLoadingGlobal}
            icon={<FiZap className="text-red-500" />}
            viewAllLink="/foryou"
        />
        <StreamCarousel
            title="Live Now"
            streams={liveStreamsLiveNow}
            isLoading={isLoadingGlobal}
            icon={<FiFilm className="text-purple-500"/>}
            viewAllLink="/live"
        />
        <CategoryPreview
            title="Categories You Might Like"
            categories={categories}
            isLoading={isLoadingGlobal}
        />
        <StreamCarousel
            title="Upcoming in Sports Cards"
            streams={upcomingSportsCards}
            isLoading={isLoadingGlobal}
            icon={<FiClock className="text-green-600"/>}
            viewAllLink="/upcoming/sports-cards"
            type="upcoming"
        />
      </main>
    </div>
  );
};

// Helper component for Feature Cards
const FeatureCard = ({ icon, title, description }) => (
  <div className="card bg-base-200 shadow-xl hover:shadow-2xl transition-all duration-300 ease-in-out group transform hover:-translate-y-1">
    <figure className="px-10 pt-10">
      {/* Clone icon to add group hover effects if desired, or pass classes directly to icon */}
      {React.cloneElement(icon, { className: `${icon.props.className || ''} w-12 h-12 group-hover:scale-110 group-hover:rotate-[-3deg] transition-transform duration-300` })}
    </figure>
    <div className="card-body items-center text-center">
      <h3 className="card-title text-xl font-bold mb-2 text-base-content group-hover:text-primary transition-colors">{title}</h3>
      <p className="text-base-content/80 leading-relaxed">{description}</p>
    </div>
  </div>
);


// Enhanced Public Homepage
const PublicHomePage = () => (
  <div className="flex flex-col min-h-screen bg-base-100">
    <main className="flex-grow">
      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center text-center overflow-hidden bg-gradient-to-br from-base-200 to-base-100 p-4 pt-20 md:pt-24 min-h-screen">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5 bg-[radial-gradient(theme(colors.base-300)_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>
        
        <div className="relative z-[1] max-w-4xl">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent animate-[fade-in-down_0.6s_ease-out_forwards]">
            Discover Unique Finds. Live.
          </h1>
          <p className="text-lg md:text-xl text-base-content/80 mb-10 max-w-2xl mx-auto animate-[fade-in-up_0.6s_ease-out_0.2s_forwards]">
            Your premier destination for live auctions, interactive shopping, and vibrant community connection. Dive into streams and uncover treasures.
          </p>
          <Link
            to="/browse"
            className="btn btn-lg btn-primary rounded-full shadow-lg hover:shadow-primary/50 hover:scale-105 active:scale-95 transition-all duration-300 ease-in-out animate-[fade-in-up_0.6s_ease-out_0.4s_forwards]"
          >
            Start Exploring Now <FiZap className="inline ml-2 h-5 w-5" />
          </Link>
        </div>

        {/* Scroll down indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 opacity-0 md:opacity-70 hidden md:block animate-[fade-in-up_0.6s_ease-out_0.8s_forwards]">
          <a href="#features" aria-label="Scroll to features" className="animate-bounce block p-2">
            <FiChevronDown className="w-8 h-8 text-base-content/50" />
          </a>
        </div>
      </section>

      {/* Feature Highlights Section */}
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

      {/* Call to Action Section */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-base-200 to-base-100">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-base-content">
            Ready to Dive In?
          </h2>
          <p className="text-lg md:text-xl text-base-content/80 mb-10 max-w-2xl mx-auto">
            Join thousands of users exploring, bidding, and discovering amazing products live. Your next favorite find is waiting!
          </p>
          <Link
            to="/browse"
            className="btn btn-lg btn-primary rounded-full shadow-lg hover:shadow-primary/50 hover:scale-105 active:scale-95 transition-all duration-300 ease-in-out"
          >
            Explore All Streams <FiSearch className="inline ml-2 h-5 w-5" />
          </Link>
        </div>
      </section>
    </main>

    {/* Footer */}
    <footer className="p-6 footer footer-center bg-base-300 text-base-content">
      <aside>
        <p>Copyright © {new Date().getFullYear()} - Your Awesome App. All rights reserved.</p>
        <p className="text-xs opacity-70">Discover. Connect. Shop Live.</p>
      </aside>
    </footer>
  </div>
);


// Main HomePage component that decides what to show
const HomePage = () => {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const isLoadingAuth = useAuthStore(state => state.isLoading);

  if (isLoadingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="loading loading-ball loading-lg text-primary"></span>
      </div>
    );
  }
  return isAuthenticated ? <LoggedInHomePage /> : <PublicHomePage />;
};

export default HomePage;