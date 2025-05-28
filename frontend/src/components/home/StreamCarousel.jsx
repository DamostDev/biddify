import React from 'react';
import { Link } from 'react-router-dom';
import StreamCard, { StreamCardSkeleton } from './StreamCard'; // Assuming StreamCard is already compact
import { FiChevronRight } from 'react-icons/fi';

const StreamCarousel = ({ title, streams, isLoading, icon, viewAllLink, className = '', type = 'live' }) => {
  // Aim for roughly 4 cards on medium to large screens, fewer on smaller.
  // Upcoming might still show more if desired, but for main carousels, let's target 4-ish.
  const skeletonCount = 4; // Default skeleton count for a typical row

  // Adjusted grid columns for more negative space (fewer items per row)
  // Tailwind CSS classes:
  // grid-cols-2: Two columns on the smallest screens
  // sm:grid-cols-2: Still two on 'sm' screens (e.g., larger phones)
  // md:grid-cols-3: Three columns on 'md' screens (e.g., tablets)
  // lg:grid-cols-4: Four columns on 'lg' screens (e.g., typical desktops)
  // xl:grid-cols-4: Still four on 'xl' screens (larger desktops), could go to 5 if space allows and desired
  const gridColsClass = 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4';

  // If you want upcoming streams to be denser, you could have a conditional here:
  // const gridColsClass = type === 'upcoming'
  //   ? 'grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6'
  //   : 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4';


  return (
    <section className={`${className}`}>
      <div className="flex justify-between items-baseline mb-3 sm:mb-4"> {/* Title and Show All link */}
        <h2 className="text-xl sm:text-2xl font-bold text-neutral-800 flex items-center gap-2.5">
          {icon && React.cloneElement(icon, { className: `${icon.props.className || ''} w-6 h-6 sm:w-7 sm:h-7 ` })}
          <span className="tracking-tight">{title}</span>
        </h2>
        {viewAllLink && (
          <Link
            to={viewAllLink}
            className="text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-0.5"
          >
            Show All <FiChevronRight className="w-4 h-4" />
          </Link>
        )}
      </div>
      <div className={`grid gap-4 sm:gap-5 md:gap-6 ${gridColsClass}`}> {/* Increased gap slightly for more negative space */}
        {isLoading
          ? Array(skeletonCount).fill(null).map((_, index) => <StreamCardSkeleton key={`skeleton-${title}-${index}`} />)
          : streams.map(stream => <StreamCard key={stream.id} stream={stream} type={type} />)}
      </div>
    </section>
  );
};

export default StreamCarousel;