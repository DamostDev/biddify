// frontend/src/components/stream/StreamVideoPlayer.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
    FiVolumeX, FiVolume2, FiMaximize, FiMinimize, FiMic, FiMicOff,
    FiShare2, FiCreditCard, FiMoreHorizontal,
    FiCheckCircle, FiXCircle, FiSlash
} from 'react-icons/fi';
import ParticipantView from './ParticipantView';
import StreamHeader from './StreamHeader'; // Import StreamHeader

// ... (formatTimeVideo helper remains the same)

const StreamVideoPlayer = ({
  mainParticipant,
  isLocalStreamer,
  isAudioMuted,
  onToggleAudioMute,
  thumbnailUrl,
  currentAuctionOnVideo,
  // Props for StreamHeader:
  streamHeaderData,       // Combined data for header
  onFollowToggleHeader,   // Follow toggle for header
  onEndStream,            // Pass this down
  // ... other potential actions
}) => {
  // ... (existing state: isFullScreen, internalTimeLeft, overlayTimerIntervalRef)
  const [isFullScreen, setIsFullScreen] = React.useState(false);
  const playerWrapperRef = React.useRef(null);
  const [internalTimeLeft, setInternalTimeLeft] = useState(0);
  const overlayTimerIntervalRef = useRef(null);


  useEffect(() => {
    // ... (existing timer useEffect for currentAuctionOnVideo)
    if (currentAuctionOnVideo && currentAuctionOnVideo.status === 'active' && currentAuctionOnVideo.end_time) {
      const endTimeMs = new Date(currentAuctionOnVideo.end_time).getTime();
      const updateTimer = () => {
        const nowMs = Date.now();
        const remainingMs = endTimeMs - nowMs;
        if (remainingMs <= 0) {
          setInternalTimeLeft(0);
          clearInterval(overlayTimerIntervalRef.current);
        } else {
          setInternalTimeLeft(Math.max(0, Math.ceil(remainingMs / 1000)));
        }
      };
      clearInterval(overlayTimerIntervalRef.current);
      updateTimer();
      overlayTimerIntervalRef.current = setInterval(updateTimer, 1000);
    } else {
      setInternalTimeLeft(0);
      clearInterval(overlayTimerIntervalRef.current);
    }
    return () => clearInterval(overlayTimerIntervalRef.current);
  }, [currentAuctionOnVideo]);


  const toggleFullScreen = () => {
    // ... (existing toggleFullScreen logic)
    const element = playerWrapperRef.current;
    if (!element) return;
    if (!document.fullscreenElement) {
      element.requestFullscreen().catch(err => console.warn(`Error full-screen: ${err.message}`));
      setIsFullScreen(true);
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      setIsFullScreen(false);
    }
  };

  const IconBtn = ({ onClick, label, children, className = "" }) => (
    // ... (existing IconBtn)
     <button
        onClick={onClick}
        className={`bg-black/50 hover:bg-black/60 text-white p-2 rounded-full shadow-md transition-all flex flex-col items-center justify-center ${className}`}
        aria-label={label}
        style={{ width: '40px', height: '40px' }}
    >
        {children}
    </button>
  );
  const formatTimeVideo = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      ref={playerWrapperRef}
      className="stream-video-player-container bg-neutral-950 relative group flex items-center justify-center"
      // ... (existing styles)
      style={{
        width: '100%',
        height: '100%',
        maxWidth: 'calc(100vh * (9/16))',
        maxHeight: '100%',
      }}
    >
      {/* StreamHeader is now part of the player, rendered above the video content */}
      {streamHeaderData && (
          <div className="absolute top-0 left-0 right-0 z-20">
            <StreamHeader
                streamData={streamHeaderData}
                onFollowToggle={onFollowToggleHeader}
                isCurrentUserHost={isLocalStreamer} // Assuming if local, they are the host for header context
                onEndStream={onEndStream} // Pass down the onEndStream callback
            />
          </div>
      )}

      <div
        className="relative w-full h-full rounded-lg overflow-hidden shadow-2xl"
        // ... (existing styles for 9:16 content area)
        style={{
          aspectRatio: '9 / 16',
          backgroundColor: 'black',
        }}
      >
        {mainParticipant ? (
          <ParticipantView
            participant={mainParticipant}
            isLocal={isLocalStreamer}
            isMuted={isAudioMuted}
          />
        ) : (
          <img
            src={thumbnailUrl || "https://via.placeholder.com/900x1600.png?text=Stream+Offline"}
            alt="Live Stream Placeholder"
            className="w-full h-full object-cover"
          />
        )}

        {/* --- OVERLAYS START --- */}
         {/* Top Left Controls are now part of StreamHeader or removed if redundant */}
        {mainParticipant && (
            <div className="absolute top-20 left-3 flex flex-col space-y-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"> {/* Adjusted top due to header */}
                <IconBtn onClick={toggleFullScreen} label={isFullScreen ? "Exit Fullscreen" : "Fullscreen"}>
                    {isFullScreen ? <FiMinimize size={16} /> : <FiMaximize size={16} />}
                </IconBtn>
                 {/* Mic Mute might be redundant if StreamHeader handles it, or keep if specific to player context */}
            </div>
        )}


        {/* Bottom Right Action Icons (Sound, Share) */}
        {mainParticipant && (
            <div className="absolute bottom-24 right-3 flex flex-col space-y-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                {onToggleAudioMute && (
                    <IconBtn
                        onClick={onToggleAudioMute}
                        label={isAudioMuted ? (isLocalStreamer ? "Unmute Mic" : "Unmute Audio") : (isLocalStreamer ? "Mute Mic" : "Mute Audio")}
                    >
                       {isLocalStreamer ?
                            (isAudioMuted ? <FiMicOff size={16} /> : <FiMic size={16} />) :
                            (isAudioMuted ? <FiVolumeX size={16} /> : <FiVolume2 size={16} />)
                        }
                    </IconBtn>
                )}
                <IconBtn onClick={() => console.log("Share clicked")} label="Share">
                    <FiShare2 size={16} />
                </IconBtn>
            </div>
        )}
        
        {/* Top Right Sandwich Menu is now handled by StreamHeader */}

        {/* Bottom Auction Info Overlay OR Auction End Overlay */}
        {/* ... (existing auction overlay logic, no change needed here) ... */}
         {mainParticipant && currentAuctionOnVideo && currentAuctionOnVideo.Product && (
            <>
            {currentAuctionOnVideo.status === 'active' && (
                <div className="absolute bottom-0 left-0 right-0 p-3 pt-8 bg-gradient-to-t from-black/90 via-black/70 to-transparent z-10 text-white text-center">
                    <h3 className="font-semibold text-base sm:text-lg leading-tight line-clamp-1 mb-0.5 text-shadow-md">{currentAuctionOnVideo.Product.title}</h3>
                    <div className="flex justify-center items-baseline gap-2 mb-1">
                        <p className="text-xl sm:text-2xl font-bold text-yellow-400 text-shadow-lg">${parseFloat(currentAuctionOnVideo.current_price || currentAuctionOnVideo.starting_price || 0).toFixed(2)}</p>
                        <p className={`text-lg font-semibold text-shadow ${internalTimeLeft <= 10 && internalTimeLeft > 0 ? 'text-red-400 animate-pulse' : 'text-neutral-200'}`}>
                            {formatTimeVideo(internalTimeLeft)}
                        </p>
                    </div>
                    {currentAuctionOnVideo.winner && currentAuctionOnVideo.winner.username && (
                        <p className="text-xs text-neutral-300 text-shadow-sm">
                            Winning: {currentAuctionOnVideo.winner.username}
                        </p>
                    )}
                </div>
            )}
            {currentAuctionOnVideo.status === 'sold' && currentAuctionOnVideo.winner && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm z-20 p-4">
                    <FiCheckCircle className="w-16 h-16 text-green-400 mb-3"/>
                    <p className="text-2xl md:text-3xl font-bold text-green-300 mb-1">SOLD!</p>
                    <p className="text-base md:text-lg text-white">To: {currentAuctionOnVideo.winner.username}</p>
                    <p className="text-xl md:text-2xl font-bold text-yellow-300">for ${parseFloat(currentAuctionOnVideo.current_price).toFixed(2)}</p>
                 </div>
            )}
             {currentAuctionOnVideo.status === 'unsold' && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm z-20 p-4">
                    <FiXCircle className="w-16 h-16 text-orange-400 mb-3"/>
                    <p className="text-2xl md:text-3xl font-bold text-orange-300">UNSOLD</p>
                    <p className="text-base md:text-lg text-white">The item did not sell.</p>
                 </div>
            )}
             {currentAuctionOnVideo.status === 'cancelled' && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm z-20 p-4">
                    <FiSlash className="w-16 h-16 text-neutral-400 mb-3"/>
                    <p className="text-2xl md:text-3xl font-bold text-neutral-300">AUCTION CANCELLED</p>
                 </div>
            )}
            </>
        )}
        {/* --- OVERLAYS END --- */}
      </div>
    </div>
  );
};
export default StreamVideoPlayer;