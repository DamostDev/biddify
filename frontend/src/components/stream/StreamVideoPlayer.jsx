// src/components/stream/StreamVideoPlayer.jsx
import React, { useState, useEffect, useRef } from 'react'; // Added useEffect
import {
    FiVolumeX, FiVolume2, FiMaximize, FiMinimize, FiMic, FiMicOff,
    FiShare2, FiCreditCard, FiMoreHorizontal,
    FiCheckCircle, FiXCircle, FiSlash // Added icons for auction status
} from 'react-icons/fi';
import ParticipantView from './ParticipantView';

// Helper to format time for the video overlay timer
const formatTimeVideo = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const StreamVideoPlayer = ({
  mainParticipant,
  isLocalStreamer,
  isAudioMuted,
  onToggleAudioMute,
  thumbnailUrl,
  currentAuctionOnVideo, // This is the full auction object { Product, status, winner, current_price, starting_price, end_time }
  // Callbacks for sandwich menu actions
  onEndStream,
  onPauseStream,
  // ... other potential actions
}) => {
  const [isFullScreen, setIsFullScreen] = React.useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false); // State for sandwich menu
  const playerWrapperRef = React.useRef(null);

  // State and effect for the internal timer for the video overlay
  const [internalTimeLeft, setInternalTimeLeft] = useState(0);
  const overlayTimerIntervalRef = useRef(null);

  useEffect(() => {
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
      clearInterval(overlayTimerIntervalRef.current); // Clear previous timer
      updateTimer(); // Initial call
      overlayTimerIntervalRef.current = setInterval(updateTimer, 1000);
    } else {
      setInternalTimeLeft(0); // Reset or use a specific value from currentAuctionOnVideo if ended
      clearInterval(overlayTimerIntervalRef.current);
    }
    // Cleanup function to clear the interval when the component unmounts or dependencies change
    return () => clearInterval(overlayTimerIntervalRef.current);
  }, [currentAuctionOnVideo]); // Re-run when auctionData (especially end_time or status) changes

  const toggleFullScreen = () => {
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
    <button
        onClick={onClick}
        className={`bg-black/50 hover:bg-black/60 text-white p-2 rounded-full shadow-md transition-all flex flex-col items-center justify-center ${className}`}
        aria-label={label}
        style={{ width: '40px', height: '40px' }} // Smaller fixed size
    >
        {children}
    </button>
  );


  return (
    <div
      ref={playerWrapperRef}
      className="stream-video-player-container bg-neutral-950 relative group flex items-center justify-center"
      style={{
        width: '100%',
        height: '100%',
        // The maxWidth and maxHeight below help maintain aspect ratio within a flex container
        // but the internal div with aspectRatio is the primary driver for the 9:16 content.
        maxWidth: 'calc(100vh * (9/16))', // Max width based on viewport height
        maxHeight: '100%',                 // Max height is container's height
      }}
    >
      <div
        className="relative w-full h-full rounded-lg overflow-hidden shadow-2xl"
        style={{
          aspectRatio: '9 / 16', // Enforce 9:16 aspect ratio for the content area
          backgroundColor: 'black', // Fallback background
        }}
      >
        {mainParticipant ? (
          <ParticipantView
            participant={mainParticipant}
            isLocal={isLocalStreamer}
            isMuted={isAudioMuted} // For local participant, this controls their video's muted prop
          />
        ) : (
          <img
            src={thumbnailUrl || "https://via.placeholder.com/900x1600.png?text=Stream+Offline"}
            alt="Live Stream Placeholder"
            className="w-full h-full object-cover" // Changed to object-cover to fill 9:16
          />
        )}

        {/* --- OVERLAYS START --- */}

        {/* Top Left Controls: Fullscreen, Mic Mute (for streamer) */}
        {mainParticipant && (
            <div className="absolute top-3 left-3 flex flex-col space-y-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <IconBtn onClick={toggleFullScreen} label={isFullScreen ? "Exit Fullscreen" : "Fullscreen"}>
                    {isFullScreen ? <FiMinimize size={16} /> : <FiMaximize size={16} />}
                </IconBtn>
                {isLocalStreamer && onToggleAudioMute && ( // Show Mic toggle only if local streamer and callback exists
                    <IconBtn onClick={onToggleAudioMute} label={isAudioMuted ? "Unmute Mic" : "Mute Mic"}>
                        {isAudioMuted ? <FiMicOff size={16} /> : <FiMic size={16} />}
                    </IconBtn>
                )}
            </div>
        )}

        {/* Bottom Right Action Icons (Sound, Share) */}
        {mainParticipant && (
            <div className="absolute bottom-24 right-3 flex flex-col space-y-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                {/* Sound Icon - For viewers to mute/unmute stream, or for streamer to mute/unmute their own mic if onToggleAudioMute handles both */}
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

        {/* Top Right Sandwich Menu */}
        {mainParticipant && (isLocalStreamer || true) && ( // Show for streamer, or always if viewers have options too
            <div className="absolute top-3 right-3 z-20"> {/* Increased z-index to be above auction end overlays */}
                 <IconBtn onClick={() => setShowMoreOptions(prev => !prev)} label="More options">
                    <FiMoreHorizontal size={18} />
                 </IconBtn>

                {showMoreOptions && (
                    <div className="absolute top-full right-0 mt-2 w-48 bg-neutral-800 rounded-md shadow-xl py-1 z-30 border border-neutral-700">
                        <button className="w-full text-left px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-700/80 flex items-center">
                            <FiCreditCard size={14} className="mr-2.5"/> Wallet
                        </button>
                        {isLocalStreamer && onPauseStream && (
                            <button onClick={() => { onPauseStream(); setShowMoreOptions(false); }} className="w-full text-left px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-700/80">
                                Pause Stream (Placeholder)
                            </button>
                        )}
                        {isLocalStreamer && onEndStream && (
                            <button onClick={() => { onEndStream(); setShowMoreOptions(false); }} className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/20 hover:text-red-300">
                                End Stream
                            </button>
                        )}
                         <div className="px-4 py-2 text-xs text-neutral-500">More soon...</div>
                    </div>
                )}
            </div>
        )}


        {/* Bottom Auction Info Overlay OR Auction End Overlay */}
        {mainParticipant && currentAuctionOnVideo && ( // Ensure currentAuctionOnVideo and its Product exist
            <>
            {currentAuctionOnVideo.status === 'active' && currentAuctionOnVideo.Product && (
                <div className="absolute bottom-0 left-0 right-0 p-3 pt-8 bg-gradient-to-t from-black/90 via-black/70 to-transparent z-10 text-white text-center"> {/* z-10 for active auction */}
                    <h3 className="font-semibold text-base sm:text-lg leading-tight line-clamp-1 mb-0.5 text-shadow-md">{currentAuctionOnVideo.Product.title}</h3>
                    <div className="flex justify-center items-baseline gap-2 mb-1">
                        <p className="text-xl sm:text-2xl font-bold text-yellow-400 text-shadow-lg">${parseFloat(currentAuctionOnVideo.current_price || currentAuctionOnVideo.starting_price || 0).toFixed(2)}</p>
                        <p className={`text-lg font-semibold text-shadow ${internalTimeLeft <= 10 && internalTimeLeft > 0 ? 'text-red-400 animate-pulse' : 'text-neutral-200'}`}>
                            {formatTimeVideo(internalTimeLeft)}
                        </p>
                    </div>
                    {currentAuctionOnVideo.winner && currentAuctionOnVideo.winner.username && ( // Show current high bidder
                        <p className="text-xs text-neutral-300 text-shadow-sm">
                            Winning: {currentAuctionOnVideo.winner.username}
                        </p>
                    )}
                    {/* "Tap to Bid" button could be removed if StreamAuctionControls is always visible, or link to it */}
                    {/* Example: <button className="mt-1 btn btn-xs btn-primary normal-case opacity-90 hover:opacity-100">Tap to Bid</button> */}
                </div>
            )}

            {currentAuctionOnVideo.status === 'sold' && currentAuctionOnVideo.winner && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm z-20 p-4"> {/* z-20 to be above active overlay */}
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