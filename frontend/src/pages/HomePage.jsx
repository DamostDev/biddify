// src/pages/HomePage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'; // Added Link for public homepage CTA
import useAuthStore from '../services/authStore';
import HomeSidebar from '../components/home/HomeSidebar';
import StreamCarousel from '../components/home/StreamCarousel';
import CategoryPreview from '../components/home/CategoryPreview';
import { FiZap, FiClock, FiTrendingUp, FiFilm } from 'react-icons/fi'; // Example icons

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

  const [isLoadingGlobal, setIsLoadingGlobal] = useState(true); // One overall loading state for simplicity of skeletons
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAllData = async () => {
      setIsLoadingGlobal(true);
      setError(null);
      try {
        const [liveData, upcomingData, categoryData] = await Promise.all([
          getLiveStreams({ limit: 12 }), // Fetch enough for multiple rows
          getUpcomingStreams({ category: 'sports-cards', limit: 8 }),
          getSuggestedCategories()
        ]);
        setLiveStreams(liveData || []);
        setUpcomingSportsCards(upcomingData || []);
        setCategories(categoryData || []);
      } catch (err) {
        console.error("Error fetching homepage data:", err);
        setError('Failed to load homepage content. Please try again.');
      } finally {
        setIsLoadingGlobal(false);
      }
    };
    fetchAllData();
  }, []);

  if (error) { /* ... error display ... */ }

  return (
    <div className="flex flex-col lg:flex-row bg-white min-h-screen">
      <HomeSidebar />
      <main className="flex-1 overflow-y-auto py-5 px-3 sm:px-4 lg:px-6 space-y-6 sm:space-y-8">
        {/* For You - typically personalized, here showing first row of general live */}
        <StreamCarousel
            title="For You"
            streams={liveStreams.slice(0, 6)} // Adjust count as needed
            isLoading={isLoadingGlobal}
            icon={<FiZap className="text-red-500" />}
            viewAllLink="/foryou" // Link to a dedicated "For You" page
        />
        {/* Second row of live streams or another category */}
        <StreamCarousel
            title="Live Now" // Or a specific category like "Collectibles Live"
            streams={liveStreams.slice(6, 12)} // Adjust count as needed
            isLoading={isLoadingGlobal}
            icon={<FiFilm className="text-purple-500"/>} // Example different icon
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
  return isAuthenticated ? <LoggedInHomePage /> : ( /* ... Your Public Homepage JSX ... */
     <main className="flex-grow flex flex-col items-center justify-center p-4 pt-20 md:pt-24 text-center overflow-hidden relative bg-gradient-to-br from-base-200 to-base-100">
        <div className="absolute inset-0 opacity-5 bg-[radial-gradient(theme(colors.base-300)_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>
        <div className="relative z-[1] max-w-4xl">
            <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
                Discover Unique Finds. Live.
            </h1>
            <p className="text-lg md:text-xl text-base-content/80 mb-10 max-w-2xl mx-auto">
                Your new destination for live auctions, shopping, and community connection. Dive into streams and find treasures.
            </p>
             <Link to="/browse" className="btn btn-lg btn-primary rounded-full shadow-lg hover:scale-105 transition-transform duration-300">
                Start Exploring Now <FiZap className="inline ml-2 h-5 w-5"/>
             </Link>
        </div>
   </main>
  );
};

export default HomePage;