import React, { useEffect, useRef } from 'react';
import { Track } from 'livekit-client';

const ParticipantView = ({ participant, isLocal, isMuted }) => {
  const videoRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    const videoElement = videoRef.current;
    const audioElement = audioRef.current;
    let videoTrackPublication = null;
    let audioTrackPublication = null;

    const handleTrackSubscribed = (track, publication) => {
      if (track.kind === Track.Kind.Video) {
        track.attach(videoElement);
      } else if (track.kind === Track.Kind.Audio) {
        // Don't attach local audio to an audio element if it's the local participant,
        // as it's captured by the browser. Remote audio should be attached.
        if (!isLocal) {
          track.attach(audioElement);
        }
      }
    };

    const handleTrackUnsubscribed = (track, publication) => {
      track.detach(videoElement); // Detach from both, even if only one was used
      track.detach(audioElement);
    };

    // Handle already subscribed tracks on initial mount
    participant.videoTrackPublications.forEach(pub => {
      if (pub.track && pub.isSubscribed) {
        pub.track.attach(videoElement);
        videoTrackPublication = pub; // Keep track for cleanup
      }
    });
    participant.audioTrackPublications.forEach(pub => {
      if (pub.track && pub.isSubscribed && !isLocal) {
        pub.track.attach(audioElement);
        audioTrackPublication = pub; // Keep track for cleanup
      }
    });
    
    participant.on(Track.Event.TrackSubscribed, handleTrackSubscribed);
    participant.on(Track.Event.TrackUnsubscribed, handleTrackUnsubscribed);

    return () => {
      participant.off(Track.Event.TrackSubscribed, handleTrackSubscribed);
      participant.off(Track.Event.TrackUnsubscribed, handleTrackUnsubscribed);
      
      // Detach any tracks that were manually attached
      if (videoTrackPublication?.track) {
        videoTrackPublication.track.detach(videoElement);
      }
      if (audioTrackPublication?.track) {
        audioTrackPublication.track.detach(audioElement);
      }
      // Also detach any other tracks that might still be attached (belt and suspenders)
      participant.videoTrackPublications.forEach(pub => pub.track?.detach(videoElement));
      participant.audioTrackPublications.forEach(pub => pub.track?.detach(audioElement));
    };
  }, [participant, isLocal]);

  return (
    <div className="participant-view relative w-full h-full bg-black flex items-center justify-center">
      <video 
        ref={videoRef} 
        width="100%" 
        height="100%" 
        autoPlay 
        playsInline 
        muted={isLocal || isMuted} // Local video is often muted to prevent echo, remote video respects `isMuted` prop
        style={{ objectFit: 'contain', maxHeight: '100%', maxWidth: '100%' }} 
      />
      {/* Audio element for remote participants (not visible) */}
      {!isLocal && <audio ref={audioRef} autoPlay playsInline muted={isMuted} />}
      {/* Optional: Display participant identity
      <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
        {participant.identity} {isLocal ? "(You)" : ""}
      </div> 
      */}
    </div>
  );
};

export default ParticipantView;