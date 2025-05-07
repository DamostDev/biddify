// src/pages/DashboardPage.jsx
import React from 'react';
import useAuthStore from '/Users/mbp/Documents/biddify/frontend/src/services/authStore.js';
import Sidebar from '../components/Sidebar'; // Adjust path
import LearnCard from '../components/LearnCard'; // Adjust path
import { FiPlayCircle } from 'react-icons/fi'; // For the rehearsal mode button

// Placeholder images (replace with your actual image paths or URLs)
const placeholderImage = "https://via.placeholder.com/400x200/FFEB3B/000000?text=Whatnot+Feature";
const listingImage = "/images/dashboard/add-listings.png"; 
const shareShowImage = "/images/dashboard/share-show.png";
const standOutImage = "/images/dashboard/stand-out.png";
const sweetenersImage = "/images/dashboard/add-sweeteners.png";
const shippingProfilesImage = "/images/dashboard/shipping-profiles.png";
const shippingOptionsImage = "/images/dashboard/shipping-options.png";
const customerServiceImage = "/images/dashboard/customer-service.png";


const DashboardPage = () => {
  const user = useAuthStore((state) => state.user);

  const learnCardsData = [
    {
      title: 'Add Listings',
      description: 'Learn how to add product listings to a scheduled show on Biddify. In just a few taps, you’ll be auction-ready with a treasure trove of listings!',
      imageUrl: listingImage, // Replace with actual image URL or path
      video: true,
    },
    {
      title: 'Share Your Show',
      description: 'Learn how to share your Biddify show to draw in a crowd of excited buyers and viewers.',
      imageUrl: shareShowImage,
    },
    {
      title: 'Stand Out',
      description: 'Learn how to run your Biddify shows for maximum visual pop and discoverability, making your stream unmissable.',
      imageUrl: standOutImage,
      video: true,
    },
    {
      title: 'Add Sweeteners',
      description: 'Use Biddify\'s marketing tools like giveaways and buyer rewards to engage and reward your buyers.',
      imageUrl: sweetenersImage,
    },
    {
      title: 'Shipping Profiles',
      description: 'Save time with Shipping Profiles! Learn more about what Shipping Profiles can do for you and how to set them up.',
      imageUrl: shippingProfilesImage,
      video: true,
    },
    {
      title: 'Shipping Options',
      description: 'Learn where to check out your default shipping options and how to turn on free shipping for your buyers.',
      imageUrl: shippingOptionsImage,
    },
    {
        title: 'Customer Service',
        description: 'Best practices for providing excellent customer service to keep your buyers happy and coming back.',
        imageUrl: customerServiceImage,
        video: true,
    },
  ];


  if (!user) {
    // This should be handled by ProtectedRoute
    return <div className="flex h-screen items-center justify-center"><span className="loading loading-dots loading-lg"></span></div>;
  }

  return (
    <div className="flex min-h-screen bg-base-300/30"> {/* Overall page container */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        {/* Top Welcome/Onboarding Banner */}
        <div className="mb-6 sm:mb-8 rounded-xl bg-gradient-to-r from-yellow-400 via-amber-400 to-orange-500 p-6 sm:p-8 text-neutral-content shadow-lg relative overflow-hidden">
          {/* Background elements for visual flair */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full opacity-50"></div>
          <div className="absolute -bottom-12 -left-12 w-40 h-40 border-4 border-white/20 rounded-full opacity-30"></div>
          
          <div className="relative z-10">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">
              You're a Biddify seller, {user.username}!
            </h1>
            <p className="text-sm sm:text-base mb-4 opacity-90">
              Watch our onboarding videos or try rehearsal mode on iOS/Android to do a test-run of a live show.
            </p>
            <button className="btn btn-neutral btn-md sm:btn-lg normal-case hover:bg-neutral-focus focus:ring-2 focus:ring-neutral-content focus:ring-offset-2 focus:ring-offset-yellow-500">
              <FiPlayCircle className="mr-2 h-5 w-5" />
              Try Rehearsal Mode on your iPhone or Android device
            </button>
          </div>
        </div>

        {/* "Learn How to Sell" Cards Section */}
        <div>
          {/* Optional: Section Header
          <h2 className="text-xl sm:text-2xl font-semibold text-base-content mb-4 sm:mb-6">
            Learn How to Sell on Biddify
          </h2> */}
          <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {learnCardsData.map((card) => (
              <LearnCard
                key={card.title}
                title={card.title}
                description={card.description}
                imageUrl={card.imageUrl || placeholderImage} // Fallback to placeholder
                video={card.video}
              />
            ))}
          </div>
        </div>

        {/* You can add more sections here, e.g., "Your Stats", "Upcoming Shows" */}

      </main>
    </div>
  );
};

export default DashboardPage;