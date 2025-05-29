// src/components/stream/StreamVideoPlayer.jsx
import React from 'react';
import { FiVolumeX, FiVolume2, FiMaximize, FiMinimize, FiMic, FiMicOff } from 'react-icons/fi';
import ParticipantView from './ParticipantView';

const StreamVideoPlayer = ({ 
  mainParticipant,      // LiveKit Participant object (Local or Remote)
  isLocalStreamer,      // Boolean: Is the mainParticipant the current logged-in user AND the streamer?
  isAudioMuted,         // For the mainParticipant's audio (could be local mic or remote audio)
  onToggleAudioMute,    // Function to toggle audio mute
  thumbnailUrl          // Fallback if no participant/video
}) => {
  const [isFullScreen, setIsFullScreen] = React.useState(false);

  const toggleFullScreen = () => {
    const playerElement = document.querySelector('.stream-video-player-container'); // Target parent for fullscreen
    if (!playerElement) return;

    if (!document.fullscreenElement) {
      playerElement.requestFullscreen().catch(err => {
        console.warn(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
      setIsFullScreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullScreen(false);
      }
    }
  };

  return (
    // Add a class to the container for fullscreen targeting
    <div className="stream-video-player-container flex-grow bg-neutral-950 relative group flex items-center justify-center">
      {mainParticipant ? (
        <ParticipantView 
            participant={mainParticipant} 
            isLocal={isLocalStreamer} 
            isMuted={isAudioMuted} // Pass the mute state
        />
      ) : (
        <img 
          src={thumbnailUrl || "https://via.placeholder.com/1280x720.png?text=Stream+Offline+or+Loading"} 
          alt="Live Stream Placeholder" 
          className="max-h-full max-w-full object-contain" 
        />
      )}

      <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex justify-between items-center">
        {onToggleAudioMute && (
            <button 
                onClick={onToggleAudioMute} 
                className="btn btn-ghost btn-sm btn-circle text-white p-1" 
                aria-label={isAudioMuted ? (isLocalStreamer ? "Unmute Mic" : "Unmute Audio") : (isLocalStreamer ? "Mute Mic" : "Mute Audio")}
            >
              {isAudioMuted ? (isLocalStreamer ? <FiMicOff size={18} /> : <FiVolumeX size={18} />) : (isLocalStreamer ? <FiMic size={18} /> : <FiVolume2 size={18} />)}
            </button>
        )}
        {!onToggleAudioMute && <div />} {/* Spacer if no mute button */}
        
        <button onClick={toggleFullScreen} className="btn btn-ghost btn-sm btn-circle text-white p-1" aria-label="Toggle fullscreen">
          {isFullScreen ? <FiMinimize size={18} /> : <FiMaximize size={18} />}
        </button>
      </div>
    </div>
  );
};

export default StreamVideoPlayer;