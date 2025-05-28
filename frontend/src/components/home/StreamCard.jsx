// src/components/home/StreamCard.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { FiUsers, FiClock } from 'react-icons/fi';

const StreamCardSkeleton = () => (
  // Mimic overall card structure with combined rounding and explicit background/shadow for skeleton
  <div className="animate-pulse group rounded-xl bg-white shadow-sm"> {/* Added bg-white and a light shadow for base */}
    <div className="aspect-[4/5] sm:aspect-[3/4] bg-neutral-200 rounded-t-xl"></div> {/* Image part with top rounding */}
    <div className="px-1 pt-2 pb-1.5"> {/* Text part wrapper, with padding similar to actual card */}
      <div className="h-3.5 bg-neutral-200 rounded w-5/6 mb-1.5"></div> {/* Adjusted margin */}
      <div className="h-2.5 bg-neutral-200 rounded w-1/2 mb-2"></div> {/* Adjusted margin */}
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
      to={`/stream/${stream.id}`}
      // Link defines overall rounded shape for shadow/focus, but overflow is handled by inner divs
      className="block group rounded-xl transition-all duration-300 ease-in-out hover:shadow-xl focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
    >
      {/* Image container: top rounding and overflow clipping */}
      <div className="relative aspect-[4/5] sm:aspect-[3/4] bg-neutral-300 rounded-t-xl overflow-hidden">
        <img
          src={stream.thumbnailUrl || `https://picsum.photos/seed/${stream.id}/300/375`}
          alt={stream.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.05]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-100"></div>

        {/* --- Unified Top Badge Logic --- */}
        {isUpcoming ? (
          <div className="absolute top-2.5 left-2.5 text-[10px] sm:text-xs font-semibold bg-sky-600 text-white px-2 py-1 rounded-md flex items-center gap-1 leading-none shadow-sm">
            <FiClock size={12} className="opacity-90 mr-0.5"/> {stream.startTime || 'Soon'}
          </div>
        ) : (
          <div
            className="absolute top-2.5 left-2.5 text-[10px] sm:text-[11px] font-bold bg-red-600 text-white
                       px-2 py-[3px] sm:py-1 rounded-[4px] flex items-center gap-1 leading-none shadow-md tracking-wide uppercase"
          >
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
            <span>LIVE</span>
            {stream.viewerCount !== null && <span className="font-normal normal-case ml-0.5">· {stream.viewerCount}</span>}
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-1.5 sm:p-2 text-white">
          <h3 className="font-semibold text-xs sm:text-sm leading-tight mb-0 line-clamp-2 group-hover:text-blue-300 transition-colors">
            {stream.title}
          </h3>
          <p className="text-[10px] sm:text-xs text-neutral-300/90 line-clamp-1">{stream.category}</p>
        </div>
      </div>

      {/* User Info container: bottom rounding */}
      <div className="pt-2 pb-1.5 px-1 sm:px-1.5 bg-white group-hover:bg-slate-50 transition-colors rounded-b-xl">
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
              <span key={tag} className="badge badge-xs bg-slate-100 text-slate-600 border-slate-200 font-medium py-1 px-1.5 text-[10px] rounded">
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