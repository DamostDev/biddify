// src/components/home/StreamCarousel.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import StreamCard, { StreamCardSkeleton } from './StreamCard';
import { FiChevronRight } from 'react-icons/fi';

const StreamCarousel = ({ title, streams, isLoading, icon, viewAllLink, className = '', type = 'live' }) => {
  const skeletonCount = type === 'upcoming' ? 8 : 6; // Adjusted for more items potentially
  const gridColsClass = type === 'upcoming'
    ? 'grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8'
    : 'grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'; // Increased general column count

  return (
    <section className={`${className}`}>
      <div className="flex justify-between items-baseline mb-2 sm:mb-3">
        <h2 className="text-lg sm:text-xl font-bold text-neutral-800 flex items-center gap-2">
          {icon && React.cloneElement(icon, { className: `${icon.props.className || ''} w-4 h-4 sm:w-5 sm:h-5 ` })}
          {title}
        </h2>
        {viewAllLink && (
          <Link
            to={viewAllLink}
            className="text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-0.5"
          >
            Show All <FiChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </Link>
        )}
      </div>
      <div className={`grid gap-2.5 sm:gap-3 ${gridColsClass}`}>
        {isLoading
          ? Array(skeletonCount).fill(null).map((_, index) => <StreamCardSkeleton key={index} />)
          : streams.map(stream => <StreamCard key={stream.id} stream={stream} type={type} />)}
      </div>
    </section>
  );
};

export default StreamCarousel;