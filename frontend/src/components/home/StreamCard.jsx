// src/components/home/StreamCard.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { FiUsers, FiClock } from 'react-icons/fi';

const StreamCardSkeleton = () => (
  <div className="animate-pulse group">
    <div className="aspect-[4/5] sm:aspect-[3/4] bg-neutral-200 rounded-lg mb-2"></div>
    <div className="px-0.5">
      <div className="h-3.5 bg-neutral-200 rounded w-5/6 mb-1"></div>
      <div className="h-2.5 bg-neutral-200 rounded w-1/2 mb-1.5"></div>
      <div className="flex items-center">
        <div className="w-5 h-5 bg-neutral-200 rounded-full mr-1.5"></div>
        <div className="h-2.5 bg-neutral-200 rounded w-1/3"></div>
      </div>
    </div>
  </div>
);

const StreamCard = ({ stream, type = 'live' }) => {
  if (!stream) return <StreamCardSkeleton />;

  const isUpcoming = type === 'upcoming' || !stream.isLive;

  return (
    <Link
      to={`/stream/${stream.id}`} // Ensure stream.id is unique and suitable for a URL
      className="block group rounded-lg overflow-hidden transition-all duration-200 focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
    >
      <div className="relative aspect-[4/5] sm:aspect-[3/4] bg-neutral-300">
        <img
          src={stream.thumbnailUrl || `https://picsum.photos/seed/${stream.id}/300/375`}
          alt={stream.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent opacity-80 group-hover:opacity-90"></div>

        {isUpcoming ? (
          <div className="absolute top-1.5 left-1.5 badge badge-xs font-semibold bg-black/70 border-none text-white px-1.5 py-0.5 h-auto gap-0.5 leading-none">
            <FiClock size={10} className="opacity-80 mr-0.5"/> {stream.startTime || 'Soon'}
          </div>
        ) : (
          <div className="absolute top-1.5 left-1.5 badge badge-xs font-bold bg-red-600 border-red-600 text-white px-1.5 py-0.5 h-auto gap-0.5 leading-none">
            <div className="w-1 h-1 bg-white rounded-full animate-pulse mr-0.5"></div>
            LIVE
          </div>
        )}

        {!isUpcoming && stream.viewerCount !== null && (
          <div className="absolute top-1.5 right-1.5 badge badge-xs font-semibold bg-black/70 border-none text-white px-1.5 py-0.5 h-auto gap-0.5 leading-none">
            <FiUsers size={10} className="opacity-80 mr-0.5"/> {stream.viewerCount}
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-1.5 sm:p-2 text-white">
          <h3 className="font-semibold text-xs sm:text-sm leading-tight mb-0 line-clamp-2 group-hover:text-blue-300 transition-colors">
            {stream.title}
          </h3>
          <p className="text-[10px] sm:text-xs text-neutral-300/90 line-clamp-1">{stream.category}</p>
        </div>
      </div>

      <div className="pt-1.5 pb-0.5 px-0.5 sm:px-1 bg-white group-hover:bg-neutral-50 transition-colors">
        <div className="flex items-center">
          <div className="avatar mr-1.5 shrink-0">
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-neutral-focus text-neutral-content flex items-center justify-center text-[10px] sm:text-xs">
              {stream.user.avatarUrl ? <img src={stream.user.avatarUrl} alt={stream.user.username} /> : stream.user.username.charAt(0).toUpperCase()}
            </div>
          </div>
          <span className="text-[11px] sm:text-xs font-medium text-neutral-700 group-hover:text-neutral-900 line-clamp-1">{stream.user.username}</span>
        </div>
        {stream.tags && stream.tags.length > 0 && (
          <div className="mt-1 space-x-1 flex flex-wrap">
            {stream.tags.slice(0, 2).map(tag => (
              <span key={tag} className="badge badge-xs bg-neutral-100 text-neutral-500 border-neutral-200 font-normal py-0.5 px-1 text-[9px] sm:text-[10px]">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
};

export { StreamCardSkeleton };
export default StreamCard;