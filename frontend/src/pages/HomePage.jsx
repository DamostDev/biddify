// frontend/src/pages/HomePage.jsx
import React, { useState, useEffect, useCallback } from 'react'; // Added useCallback
import { Link } from 'react-router-dom';
import useAuthStore from '../services/authStore';
import HomeSidebar from '../components/home/HomeSidebar';
import StreamCarousel from '../components/home/StreamCarousel';
import CategoryPreview from '../components/home/CategoryPreview';
import { 
    FiZap, 
    FiClock, 
    FiFilm, 
    FiChevronDown, // Added
    FiPlayCircle,   // Added
    FiGift,         // Added
    FiUsers,        // Added
    FiSearch        // Added
} from 'react-icons/fi';
import streamService from '../services/streamService';

// MOCK API for categories - replace if you have a real one
const placeholderCategoryData = [
  { id: 'sneakers-streetwear', name: 'Sneakers & Streetwear', imageUrl: 'https://picsum.photos/seed/cat10/300/180' },
  { id: 'trading-card-games', name: 'Trading Card Games', imageUrl: 'https://picsum.photos/seed/cat13/300/180' },
  { id: 'vintage-toys', name: 'Vintage Toys', imageUrl: 'https://picsum.photos/seed/cat14/300/180' },
];
const mockApiCall = (data, delay = 700) => new Promise(resolve => setTimeout(() => resolve(data), delay));
const getSuggestedCategories = async () => { return mockApiCall(placeholderCategoryData); };
// END MOCK

const LoggedInHomePage = () => {
  const [rawLiveStreams, setRawLiveStreams] = useState([]); // Store raw API response
  const [rawUpcomingSportsCards, setRawUpcomingSportsCards] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true); // Combined loading state
  const [error, setError] = useState(null);

  // Memoize the transformation function if it's defined inside the component
  const transformStreamData = useCallback((stream) => {
    if (!stream || typeof stream.stream_id === 'undefined') {
      // console.warn("transformStreamData called with invalid stream:", stream);
      return null; // Or some default structure, but null helps filter out bad data
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
      startTime: stream.status === 'scheduled' ? new Date(stream.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
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
          streamService.getAllStreams({ status: 'scheduled', category_id: '1', limit: 6 }), // Replace '1' with actual category ID if dynamic
          getSuggestedCategories()
        ]);

        if (liveDataResult.status === 'fulfilled') {
          setRawLiveStreams(liveDataResult.value || []);
        } else {
          console.error("Error fetching live streams:", liveDataResult.reason);
          setError(prev => (prev ? `${prev}, ` : '') + 'Failed to load live streams.');
        }

        if (upcomingDataResult.status === 'fulfilled') {
          setRawUpcomingSportsCards(upcomingDataResult.value || []);
        } else {
          console.error("Error fetching upcoming streams:", upcomingDataResult.reason);
           setError(prev => (prev ? `${prev}, ` : '') + 'Failed to load upcoming streams.');
        }

        if (categoryDataResult.status === 'fulfilled') {
          setCategories(categoryDataResult.value || []);
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
  }, []);

  // Perform transformations only when raw data is available and not loading
  // And ensure filtering out nulls from transformStreamData if it can return null
  const liveStreamsForYou = !isLoading && rawLiveStreams.length > 0
    ? rawLiveStreams.slice(0, 4).map(transformStreamData).filter(Boolean)
    : [];
  const liveStreamsLiveNow = !isLoading && rawLiveStreams.length > 0
    ? rawLiveStreams.slice(4, 8).map(transformStreamData).filter(Boolean)
    : [];
  const transformedUpcomingSportsCards = !isLoading && rawUpcomingSportsCards.length > 0
    ? rawUpcomingSportsCards.map(transformStreamData).filter(Boolean)
    : [];

  if (isLoading) { // Show a general loading state for the whole page if preferred
      return (
          <div className="flex flex-1 items-center justify-center p-10">
              <span className="loading loading-lg loading-dots text-primary"></span>
          </div>
      );
  }

  if (error && liveStreamsForYou.length === 0 && liveStreamsLiveNow.length === 0) {
    return <div className="flex-1 flex items-center justify-center p-4 text-error">{error}</div>;
  }

  return (
    <div className="flex flex-col lg:flex-row bg-white min-h-screen">
      <HomeSidebar />
      <main className="flex-1 overflow-y-auto bg-white py-8 px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 space-y-10 sm:space-y-12">
        <StreamCarousel
            title="For You"
            streams={liveStreamsForYou}
            isLoading={isLoading && liveStreamsForYou.length === 0}
            icon={<FiZap className="text-red-500" />}
            viewAllLink="/foryou"
            type="live"
        />
        <StreamCarousel
            title="Live Now"
            streams={liveStreamsLiveNow}
            isLoading={isLoading && liveStreamsLiveNow.length === 0}
            icon={<FiFilm className="text-purple-500"/>}
            viewAllLink="/live"
            type="live"
        />
        <CategoryPreview
            title="Categories You Might Like"
            categories={categories}
            isLoading={isLoading && categories.length === 0}
        />
        <StreamCarousel
            title="Upcoming in Sports Cards" // Make sure your backend returns a category_id that matches
            streams={transformedUpcomingSportsCards}
            isLoading={isLoading && transformedUpcomingSportsCards.length === 0}
            icon={<FiClock className="text-green-600"/>}
            viewAllLink="/upcoming/sports-cards"
            type="upcoming"
        />
         {error && <p className="text-center text-sm text-error mt-4">{error}</p>}
      </main>
    </div>
  );
};

// ... PublicHomePage and main HomePage component remain the same
// (ensure imports in PublicHomePage for FiZap, FiChevronDown, FiPlayCircle, FiGift, FiUsers, FiSearch are present)
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
            to="/live" // Changed to /live or /foryou
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
            to="/live" // Changed to /live or /foryou
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

const HomePage = () => {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const isLoadingAuth = useAuthStore(state => state.isLoading);

  // Show a general loading screen for the entire app if auth is still loading
  // This is different from the LoggedInHomePage's internal loading state for content
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