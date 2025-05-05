import React from 'react';
import { FiShoppingBag, FiCamera, FiHeart } from 'react-icons/fi'; // Example icons

const HomePage = () => {
  return (
    // Use main element for semantic structure, add gradient bg
    <main className="flex-grow flex flex-col items-center justify-center p-4 pt-20 md:pt-24 text-center overflow-hidden relative ">
        {/* Optional: Subtle background pattern or shapes */}
        <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>

        <div className="relative z-[1] max-w-4xl"> {/* Ensure content is above bg pattern */}
            {/* Use theme colors for text */}
            <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
                Discover Unique Finds. Live.
            </h1>
            <p className="text-lg md:text-xl text-base-content/80 mb-10 max-w-2xl mx-auto">
                Your new destination for live auctions, shopping, and community connection. Dive into streams and find treasures.
            </p>
            {/* Example CTA Button */}
             <button
                className="btn btn-lg btn-primary rounded-full shadow-lg hover:scale-105 transition-transform duration-300"
                // onClick={() => openAuthModal('signup')} // Connect to store if needed here
             >
                Start Exploring Now <FiShoppingBag className="inline ml-2 h-5 w-5"/>
             </button>

            {/* Example Feature Icons */}
             <div className="flex justify-center gap-8 md:gap-16 mt-16 text-primary">
                <div className="flex flex-col items-center">
                    <FiCamera size={32} className="mb-2"/>
                    <span className="text-sm font-medium text-base-content/90">Live Streaming</span>
                </div>
                 <div className="flex flex-col items-center">
                    <FiShoppingBag size={32} className="mb-2"/>
                    <span className="text-sm font-medium text-base-content/90">Unique Items</span>
                </div>
                 <div className="flex flex-col items-center">
                    <FiHeart size={32} className="mb-2"/>
                    <span className="text-sm font-medium text-base-content/90">Community</span>
                </div>
             </div>
        </div>
   </main>
  );
};
export default HomePage;