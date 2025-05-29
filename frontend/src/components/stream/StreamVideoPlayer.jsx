// src/components/stream/StreamVideoPlayer.jsx
import React, { useState, useRef } from 'react';
import {
    FiVolumeX, FiVolume2, FiMaximize, FiMinimize, FiMic, FiMicOff,
    FiShare2, FiCreditCard, FiMoreHorizontal // Changed FiMoreVertical to FiMoreHorizontal for sandwich
} from 'react-icons/fi';
import ParticipantView from './ParticipantView';

// Placeholder for auction data
const auctionOverlayDataExample = {
  title: "CROSSFIRE || SUDDEN DEATH AUCTION #121",
  bids: 11,
  currentPrice: 24,
  timeLeft: "00:05",
  winner: null, // "daveg97",
  statusMessage: "Tap to Bid",
  notShippableToYou: false,
};

const StreamVideoPlayer = ({
  mainParticipant,
  isLocalStreamer,
  isAudioMuted,
  onToggleAudioMute,
  thumbnailUrl,
  currentAuctionOnVideo = auctionOverlayDataExample,
  // Callbacks for sandwich menu actions
  onEndStream,
  onPauseStream,
  // ... other potential actions
}) => {
  const [isFullScreen, setIsFullScreen] = React.useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false); // State for sandwich menu
  const playerWrapperRef = React.useRef(null);

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
        {/* <span className="block text-[9px] mt-0.5 leading-none">{label}</span> */} {/* Labels removed for cleaner look, use aria-label */}
    </button>
  );


  return (
    <div
      ref={playerWrapperRef}
      className="stream-video-player-container bg-neutral-950 relative group flex items-center justify-center"
      style={{
        width: '100%',
        height: '100%',
        maxWidth: 'calc(100vh * (9/16))',
        maxHeight: '100%',
      }}
    >
      <div
        className="relative w-full h-full rounded-lg overflow-hidden shadow-2xl"
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
            className="w-full h-full object-contain"
          />
        )}

        {/* --- OVERLAYS START --- */}

        {/* Top Left Controls: Fullscreen, Mic Mute (for streamer) */}
        {mainParticipant && (
            <div className="absolute top-3 left-3 flex flex-col space-y-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <IconBtn onClick={toggleFullScreen} label={isFullScreen ? "Exit Fullscreen" : "Fullscreen"}>
                    {isFullScreen ? <FiMinimize size={16} /> : <FiMaximize size={16} />}
                </IconBtn>
                {isLocalStreamer && onToggleAudioMute && (
                    <IconBtn onClick={onToggleAudioMute} label={isAudioMuted ? "Unmute Mic" : "Mute Mic"}>
                        {isAudioMuted ? <FiMicOff size={16} /> : <FiMic size={16} />}
                    </IconBtn>
                )}
            </div>
        )}

        {/* Bottom Right Action Icons (Sound, Share) */}
        {mainParticipant && (
            <div className="absolute bottom-24 right-3 flex flex-col space-y-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                 {/* Sound Icon - Only for viewer if streamer controls mic from elsewhere */}
                 {/* Or always show if onToggleAudioMute handles both contexts */}
                {onToggleAudioMute && (
                    <IconBtn onClick={onToggleAudioMute} label={isAudioMuted ? (isLocalStreamer ? "Unmute Mic" : "Unmute Audio") : (isLocalStreamer ? "Mute Mic" : "Mute Audio")}>
                       {/* Show Mic icon if local streamer, else Volume icon */}
                       {isLocalStreamer ? 
                            (isAudioMuted ? <FiMicOff size={16} /> : <FiMic size={16} />) :
                            (isAudioMuted ? <FiVolumeX size={16} /> : <FiVolume2 size={16} />)
                        }
                    </IconBtn>
                )}
                <IconBtn onClick={() => console.log("Share clicked")} label="Share">
                    <FiShare2 size={16} />
                </IconBtn>
                 {/* Wallet Icon - Moved to sandwich for less clutter */}
            </div>
        )}

        {/* Top Right Sandwich Menu */}
        {mainParticipant && (isLocalStreamer || true) && ( // Show for streamer, or always if viewers have options too
            <div className="absolute top-3 right-3 z-20">
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
                        {/* Add other options here */}
                         <div className="px-4 py-2 text-xs text-neutral-500">More soon...</div>
                    </div>
                )}
            </div>
        )}


        {/* Bottom Auction Info Overlay */}
        {mainParticipant && currentAuctionOnVideo && (
            <div className="absolute bottom-0 left-0 right-0 p-3 pt-8 bg-gradient-to-t from-black/90 via-black/70 to-transparent z-0 text-white"> {/* z-0 to be behind hover icons */}
                {/* ... (auction info content from previous example, unchanged) ... */}
                 {currentAuctionOnVideo.winner && (
                     <p className="text-xs text-center mb-1">
                        <span className="bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full text-[10px] font-medium mr-1">WINNER</span>
                        {currentAuctionOnVideo.winner} won!
                    </p>
                )}
                <h3 className="font-semibold text-base sm:text-lg leading-tight line-clamp-2 mb-1">{currentAuctionOnVideo.title}</h3>
                <div className="flex justify-between items-end mb-2">
                    <div>
                        <p className="text-xs text-neutral-300">{currentAuctionOnVideo.bids} Bids</p>
                        {currentAuctionOnVideo.notShippableToYou && (
                             <p className="text-xs text-red-400">Not shippable to you</p>
                        )}
                    </div>
                    <div className="text-right">
                        <p className="text-xl sm:text-2xl font-bold text-yellow-400">${currentAuctionOnVideo.currentPrice}</p>
                        <p className={`text-sm font-semibold ${currentAuctionOnVideo.timeLeft === "00:00" || currentAuctionOnVideo.timeLeft?.startsWith("00:0") ? 'text-red-500 animate-pulse' : 'text-neutral-300'}`}>
                            <span className="text-red-500 mr-1">💀</span> {/* Skull icon */}
                            {currentAuctionOnVideo.timeLeft}
                        </p>
                    </div>
                </div>
                 <button className="w-full btn btn-md bg-blue-600/80 hover:bg-blue-500/80 border-blue-500/50 text-white font-semibold normal-case backdrop-blur-sm">
                    {currentAuctionOnVideo.statusMessage}
                </button>
            </div>
        )}
        {/* --- OVERLAYS END --- */}
      </div>
    </div>
  );
};

export default StreamVideoPlayer;