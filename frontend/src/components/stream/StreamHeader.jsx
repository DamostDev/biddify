import React from 'react';
import { Link } from 'react-router-dom';
import { FiCopy, FiMoreVertical, FiStar, FiCheckCircle, FiArrowLeft } from 'react-icons/fi';

const StreamHeader = ({ streamData, onFollowToggle, isCurrentUserHost }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(streamData.streamUrl || window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="h-14 sm:h-16 bg-neutral-900 text-white flex items-center justify-between px-3 sm:px-4 border-b border-neutral-800 shrink-0">
      <div className="flex items-center gap-2 sm:gap-3">
        <Link to="/" className="btn btn-ghost btn-sm btn-circle p-0 -ml-1 md:hidden"> {/* Back button for mobile */}
            <FiArrowLeft size={20}/>
        </Link>
        <div className="avatar">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-neutral-700">
            {streamData.host.avatarUrl ? <img src={streamData.host.avatarUrl} alt={streamData.host.username} /> : streamData.host.username.charAt(0).toUpperCase()}
          </div>
        </div>
        <div>
          <h1 className="text-sm sm:text-base font-semibold leading-tight">{streamData.host.username}</h1>
          <div className="flex items-center text-xs text-neutral-400">
            <FiStar className="w-3 h-3 mr-1 text-yellow-400 fill-current" />
            <span>{streamData.host.rating}</span>
            {!isCurrentUserHost && streamData.host.user_id && ( // Show follow button if not the host and host_id exists
              <button
                className="ml-2.5 text-xs font-medium text-yellow-400 hover:text-yellow-300 disabled:text-neutral-500 disabled:cursor-not-allowed"
                onClick={onFollowToggle}
                disabled={!onFollowToggle} // Disable if handler not provided
              >
                {streamData.host.isFollowed ? <span className="flex items-center gap-1"><FiCheckCircle size={12}/> Following</span> : '+ Follow'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="hidden sm:flex items-center gap-1 text-xs bg-neutral-800 px-2 py-1 rounded-md">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          <span>{streamData.viewerCount}</span>
        </div>
        <div className="hidden md:flex items-center bg-neutral-800 rounded-full text-xs h-8">
          <span className="px-3 text-neutral-400 truncate max-w-[200px]">{streamData.streamUrl}</span>
          <button onClick={handleCopyLink} className="btn btn-xs btn-neutral rounded-full h-7 px-3 normal-case">
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
         <button className="btn btn-ghost btn-sm btn-circle p-0" aria-label="More options">
          <FiMoreVertical size={20} />
        </button>
      </div>
    </header>
  );
};

export default StreamHeader;