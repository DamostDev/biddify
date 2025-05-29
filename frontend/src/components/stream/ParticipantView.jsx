// src/components/stream/ParticipantView.jsx
import React, { useEffect, useRef } from 'react';
import { Track, RoomEvent } from 'livekit-client';

const ParticipantView = ({ participant, isLocal, isMuted }) => {
  const videoRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    // ... (your existing useEffect logic for attaching/detaching tracks is good)
    // No changes needed here based on the aspect ratio goal itself,
    // assuming tracks are attaching correctly.
    if (!participant) return;

    const videoElement = videoRef.current;
    const audioElement = audioRef.current;

    const handleTrackSubscribed = (track, publication) => {
      if (track.kind === Track.Kind.Video && videoElement) {
        track.attach(videoElement);
      } else if (track.kind === Track.Kind.Audio && !isLocal && audioElement) {
        track.attach(audioElement);
      }
    };

    const handleTrackUnsubscribed = (track, publication) => {
      track.detach(videoElement);
      track.detach(audioElement);
    };
    
    const handleLocalTrackPublished = (publication) => {
        if (publication.track?.kind === Track.Kind.Video && videoElement) {
            publication.track.attach(videoElement);
        }
    };
    
    participant.videoTrackPublications.forEach(pub => {
      if (pub.track) { 
        if(pub.track.kind === Track.Kind.Video && videoElement) pub.track.attach(videoElement);
      } else if (pub.isSubscribed && pub.track === null) {
         pub.on('subscribed', (track) => handleTrackSubscribed(track, pub));
      }
    });
    if (!isLocal) { 
        participant.audioTrackPublications.forEach(pub => {
          if (pub.track && audioElement) {
            pub.track.attach(audioElement);
          } else if (pub.isSubscribed && pub.track === null && audioElement) {
            pub.on('subscribed', (track) => handleTrackSubscribed(track, pub));
          }
        });
    }

    if (isLocal) {
        participant.on(RoomEvent.LocalTrackPublished, handleLocalTrackPublished);
    } else {
        participant.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
    }
    participant.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);

    return () => {
      if (isLocal) {
        participant.off(RoomEvent.LocalTrackPublished, handleLocalTrackPublished);
      } else {
        participant.off(RoomEvent.TrackSubscribed, handleTrackSubscribed);
      }
      participant.off(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
      participant.videoTrackPublications.forEach(pub => pub.track?.detach(videoElement));
      participant.audioTrackPublications.forEach(pub => pub.track?.detach(audioElement));
    };
  }, [participant, isLocal]);

  useEffect(() => {
    if (audioRef.current && !isLocal) {
      audioRef.current.muted = isMuted;
    }
  }, [isMuted, isLocal]);

  if (!participant) return null;

  return (
    <div className="participant-view relative w-full h-full bg-black flex items-center justify-center overflow-hidden"> {/* Added overflow-hidden */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className="w-full h-full"
        style={{ objectFit: 'cover' }} // <<--- THIS IS THE KEY CHANGE for the "Whatnot" feel
      />
      {!isLocal && ( <audio ref={audioRef} autoPlay playsInline /> )}
    </div>
  );
};

export default ParticipantView;