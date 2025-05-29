// src/pages/MinimalStreamPage.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Room, ConnectionState, Track, LogLevel,
    // Participant // LocalParticipant, RemoteParticipant might be more specific if needed
} from 'livekit-client';
import useAuthStore from '../services/authStore.js'; // Ensure this path is correct
import streamService from '../services/streamService.js';

// ParticipantView (ASSUMED UNCHANGED AND CORRECT from your initial version)
const ParticipantView = ({ participant, isLocal, participantType }) => {
    const videoRef = useRef(null);
    const audioRef = useRef(null);

    useEffect(() => {
        if (!participant) return;
        const videoEl = videoRef.current;
        const audioEl = audioRef.current;

        const handleTrackAttached = (track) => {
            // console.log(`[ParticipantView:${participantType}] Attaching track ${track.kind} for ${participant.identity}`);
            if (track.kind === Track.Kind.Video) {
                if (videoEl) track.attach(videoEl);
            } else if (track.kind === Track.Kind.Audio && !isLocal) {
                if (audioEl) track.attach(audioEl);
            }
        };
        const handleTrackDetached = (track) => {
            // console.log(`[ParticipantView:${participantType}] Detaching track ${track.kind} for ${participant.identity}`);
            track.detach(videoEl); // Detach from both, it's safe
            track.detach(audioEl);
        };

        const setupTracks = (p) => {
            p.videoTrackPublications.forEach(pub => {
                if (pub.track && pub.isSubscribed) handleTrackAttached(pub.track);
                else if (pub.isSubscribed && !pub.track) {
                    pub.on("subscribed", handleTrackAttached);
                }
            });
            p.audioTrackPublications.forEach(pub => {
                if (pub.track && pub.isSubscribed) handleTrackAttached(pub.track);
                else if (pub.isSubscribed && !pub.track) {
                    pub.on("subscribed", handleTrackAttached);
                }
            });
        };

        setupTracks(participant);

        const handleTrackPublished = (pub) => {
            // console.log(`[ParticipantView:${participantType}] Event: trackPublished ${pub.kind} by ${participant.identity}`);
            if (pub.track && pub.isSubscribed) { // isSubscribed is for remote, for local it's just published
                handleTrackAttached(pub.track);
            } else if (pub.isSubscribed && !pub.track) { // Check for remote becoming available
                 pub.on("subscribed", handleTrackAttached);
            } else if (isLocal && pub.track) { // For local participant, track is available immediately on publish
                handleTrackAttached(pub.track);
            }
        }
        const handleTrackSubscribedEvent = (track) => {
            // console.log(`[ParticipantView:${participantType}] Event: trackSubscribed ${track.kind} by ${participant.identity}`);
            handleTrackAttached(track);
        }

        // Event listeners
        if (isLocal) {
            participant.on("localTrackPublished", handleTrackPublished);
        } else {
            participant.on("trackSubscribed", handleTrackSubscribedEvent);
        }
        participant.on("trackUnpublished", (pub) => pub.track && handleTrackDetached(pub.track));
        participant.on("trackUnsubscribed", (track) => handleTrackDetached(track));


        return () => {
            if (isLocal) {
                participant.off("localTrackPublished", handleTrackPublished);
            } else {
                participant.off("trackSubscribed", handleTrackSubscribedEvent);
            }
            participant.off("trackUnpublished", (pub) => pub.track && handleTrackDetached(pub.track));
            participant.off("trackUnsubscribed", (track) => handleTrackDetached(track));

            // Detach all tracks on cleanup
            participant.videoTrackPublications.forEach(pub => pub.track?.detach(videoEl));
            participant.audioTrackPublications.forEach(pub => pub.track?.detach(audioEl));
        };
    }, [participant, isLocal, participantType]); // participant identity might change, re-run

    if (!participant) return null;

    return (
        <div style={{ border: `2px solid ${isLocal ? 'limegreen' : 'deepskyblue'}`, padding: '10px', margin: '10px', width: '480px', height: '360px', backgroundColor: '#222' }}>
            <p style={{ color: 'white' }}>{participantType}: {participant.identity} {isLocal ? '(You)' : ''}</p>
            <video ref={videoRef} style={{ width: '100%', height: '85%', objectFit: 'contain', backgroundColor: 'black' }} autoPlay playsInline muted={isLocal} />
            {!isLocal && <audio ref={audioRef} autoPlay playsInline />} {/* Remote audio, not muted */}
        </div>
    );
};


function MinimalStreamPage() {
    const { streamId } = useParams();
    const navigate = useNavigate();
    const { user: currentUser, isAuthenticated } = useAuthStore();

    const [localParticipant, setLocalParticipant] = useState(null);
    const [streamerParticipant, setStreamerParticipant] = useState(null);
    const [isCurrentUserStreamer, setIsCurrentUserStreamer] = useState(false);
    const [statusMessage, setStatusMessage] = useState('Idle');
    const [error, setError] = useState('');
    const [isLoadingStreamData, setIsLoadingStreamData] = useState(true);
    const [liveKitToken, setLiveKitToken] = useState(null);
    const [liveKitUrl, setLiveKitUrl] = useState(null);

    const roomRef = useRef(null);
    // Ref to store isCurrentUserStreamer for use in callbacks without making them deps
    const isCurrentUserStreamerRef = useRef(isCurrentUserStreamer);
    useEffect(() => {
        isCurrentUserStreamerRef.current = isCurrentUserStreamer;
    }, [isCurrentUserStreamer]);


    const safeParseMetadata = (metadataString) => {
        let meta = {};
        if (!metadataString) return meta;
        try { meta = JSON.parse(metadataString); }
        catch (e) { console.warn("Failed to parse metadata:", metadataString, e); }
        return meta;
    };

    // Effect 1: Fetch Stream Data & LiveKit Token
    useEffect(() => {
        if (!streamId) { setError("Stream ID is missing."); setIsLoadingStreamData(false); return; }
        let isMounted = true;
        setIsLoadingStreamData(true); setStatusMessage("Fetching stream details..."); setError('');
        setLiveKitToken(null); setLiveKitUrl(null);

        console.log(`[MinimalPage EFFECT 1] streamId: ${streamId}`);
        const init = async () => {
            try {
                const apiStreamData = await streamService.getStreamDetails(streamId);
                if (!isMounted) return;

                const userIsStreamerCheck = currentUser?.user_id === apiStreamData.user_id;
                setIsCurrentUserStreamer(userIsStreamerCheck); // This will update isCurrentUserStreamerRef too
                console.log("[MinimalPage EFFECT 1] User is streamer (from API):", userIsStreamerCheck);

                setStatusMessage(userIsStreamerCheck ? "Fetching streamer token..." : "Fetching viewer token...");
                let tokenResponse;
                if (userIsStreamerCheck) {
                    if (!isAuthenticated) throw new Error("Login required to start stream.");
                    tokenResponse = await streamService.goLiveStreamer(streamId);
                } else {
                    tokenResponse = await streamService.joinLiveStreamViewer(streamId);
                }
                if (!isMounted) return;

                if (tokenResponse && tokenResponse.token && tokenResponse.livekitUrl) {
                    setLiveKitToken(tokenResponse.token);
                    setLiveKitUrl(tokenResponse.livekitUrl);
                    console.log("[MinimalPage EFFECT 1] Token and URL acquired.");
                } else {
                    throw new Error(tokenResponse?.message || "Failed to get LiveKit token/URL.");
                }
            } catch (err) {
                console.error("[MinimalPage EFFECT 1] Init Error:", err);
                if (isMounted) {
                    setError(err?.response?.data?.message || err?.message || "Failed to load stream data.");
                    setStatusMessage("Error during initial setup");
                }
            } finally {
                if (isMounted) setIsLoadingStreamData(false);
            }
        };
        init();
        return () => { isMounted = false; };
    }, [streamId, currentUser, isAuthenticated]);


    // --- LiveKit Event Handlers ---
    // These are defined once and their references should remain stable.
    // They will use roomRef.current and other refs/state as needed.

    const handleNewStreamerCandidate = useCallback((participant) => {
        if (!participant || !roomRef.current) return;
        const meta = safeParseMetadata(participant.metadata);

        if (meta.role === 'streamer') {
            console.log('[MinimalPage CB] Streamer candidate identified:', participant.identity);
            // Use the ref for isCurrentUserStreamer to avoid making it a direct dep of this callback
            if (participant.sid !== roomRef.current.localParticipant.sid || !isCurrentUserStreamerRef.current) {
                setStreamerParticipant(participant);
            }
        }
    }, []); // No direct state dependencies here, relies on refs or passed params

    const handleConnectionStateChange = useCallback(async (connectionState) => {
        if (!roomRef.current) { // Safety check
            console.warn("[MinimalPage CB] handleConnectionStateChange called but no roomRef.current");
            return;
        }
        const currentRoom = roomRef.current; // Capture current room instance for this call

        console.log('[MinimalPage CB] Connection State Changed:', connectionState, 'for room SID:', currentRoom.sid);
        setStatusMessage(`LiveKit: ${connectionState}`);

        if (connectionState === ConnectionState.Connected) {
            console.log("[MinimalPage CB] ---> CONNECTION ESTABLISHED <--- Room Name:", currentRoom.name);
            setLocalParticipant(currentRoom.localParticipant);

            currentRoom.remoteParticipants.forEach(p => handleNewStreamerCandidate(p));

            if (isCurrentUserStreamerRef.current && currentRoom.localParticipant) {
                console.log("[MinimalPage CB] User is streamer. Enabling media...");
                try {
                    await currentRoom.localParticipant.setCameraEnabled(true);
                    await currentRoom.localParticipant.setMicrophoneEnabled(true);
                    console.log("[MinimalPage CB] Streamer media enabled.");
                } catch (mediaError) {
                    console.error("[MinimalPage CB] Error enabling media:", mediaError);
                    setError(prev => `${prev} Media Error: ${mediaError.message}. Check permissions.`);
                }
            }
        } else if (connectionState === ConnectionState.Disconnected) {
            console.log("[MinimalPage CB] Disconnected from room SID:", currentRoom.sid);
            setLocalParticipant(null);
            setStreamerParticipant(null);
            // Main useEffect cleanup handles roomRef.current = null
        } else if (connectionState === ConnectionState.Failed) {
            setError(prev => `${prev} LiveKit connection failed.`);
        }
    }, [handleNewStreamerCandidate]); // handleNewStreamerCandidate is itself a stable useCallback

    const handleTrackSubscribed = useCallback((track, publication, remoteParticipant) => {
        console.log(`[MinimalPage CB RoomEvent.TrackSubscribed] Track: ${track.kind} from ${remoteParticipant.identity}`);
        handleNewStreamerCandidate(remoteParticipant);
    }, [handleNewStreamerCandidate]); // Stable dependency

    const handleParticipantConnectedEvent = useCallback((participant) => {
        console.log('[MinimalPage CB LK Event] Participant Connected:', participant.identity);
        handleNewStreamerCandidate(participant);
    }, [handleNewStreamerCandidate]); // Stable dependency

    const handleParticipantDisconnectedEvent = useCallback((participant) => {
        console.log('[MinimalPage CB LK Event] Participant Disconnected:', participant.identity);
        setStreamerParticipant(prevStreamer => {
            if (prevStreamer?.sid === participant.sid) {
                console.log('[MinimalPage CB] Streamer participant (being displayed) disconnected.');
                return null;
            }
            return prevStreamer;
        });
    }, []); // No dependencies, functional update for setStreamerParticipant

    // Effect 2: LiveKit Room Connection & Management
    useEffect(() => {
        if (!liveKitUrl || !liveKitToken || isLoadingStreamData) {
            console.log(`[MinimalPage EFFECT 2 - MAIN] SKIPPING: No URL/Token or still loading. URL: ${!!liveKitUrl}, Token: ${!!liveKitToken}, isLoading: ${isLoadingStreamData}`);
            return;
        }

        // If a room instance already exists, it means this effect is re-running.
        // This should ideally only happen if liveKitUrl or liveKitToken changes.
        // We always disconnect the old one before creating a new one.
        if (roomRef.current) {
            console.log("[MinimalPage EFFECT 2 - MAIN] Existing room found. Disconnecting before creating new one. SID:", roomRef.current.sid);
            roomRef.current.disconnect(true);
            // roomRef.current.removeAllListeners(); // removeAllListeners will be called on the new `room` instance in its cleanup
            roomRef.current = null;
        }

        console.log(`[MinimalPage EFFECT 2 - MAIN] Creating and Connecting new Room. URL: ${liveKitUrl}`);
        setStatusMessage("Connecting to LiveKit...");

        const room = new Room({
            logLevel: LogLevel.debug,
            adaptiveStream: true,
            dynacast: true,
        });
        roomRef.current = room;

        // Attach event listeners using the stable useCallback handlers
        room.on(ConnectionState.Connected, () => handleConnectionStateChange(ConnectionState.Connected));
        room.on(ConnectionState.Connecting, () => handleConnectionStateChange(ConnectionState.Connecting));
        room.on(ConnectionState.Reconnecting, () => handleConnectionStateChange(ConnectionState.Reconnecting));
        room.on(ConnectionState.Disconnected, () => handleConnectionStateChange(ConnectionState.Disconnected));
        // Explicitly handle Failed state from the event
        room.on(ConnectionState.Failed, () => {
            console.error("[MinimalPage EFFECT 2 - MAIN] Room connection explicitly FAILED via event.");
            handleConnectionStateChange(ConnectionState.Failed);
            if (roomRef.current === room) { // If the failed room is the current one
                roomRef.current = null; // Allow potential re-connection if token/url changes
            }
        });


        room.on("trackSubscribed", handleTrackSubscribed);
        room.on("participantConnected", handleParticipantConnectedEvent);
        room.on("participantDisconnected", handleParticipantDisconnectedEvent);

        room.connect(liveKitUrl, liveKitToken)
            .then(() => {
                console.log('[MinimalPage EFFECT 2 - MAIN] room.connect() promise resolved. Current room state:', room.state);
                // Connection success is primarily handled by the ConnectionState.Connected event
            })
            .catch(err => {
                console.error("[MinimalPage EFFECT 2 - MAIN] room.connect() promise REJECTED:", err);
                setError(prev => `${prev} LiveKit Connection Init Failed: ${err.message}`);
                setStatusMessage("Error: Connection Init Failed");
                // Ensure roomRef is cleared if this specific connection attempt fails badly
                if (roomRef.current === room) {
                    roomRef.current.removeAllListeners(); // Clean listeners on failed room
                    roomRef.current.disconnect(true);    // Attempt to disconnect
                    roomRef.current = null;
                }
            });

        return () => {
            console.log("[MinimalPage EFFECT 2 - MAIN] Cleanup: Disconnecting room SID:", room?.sid);
            // Check if the room instance we are cleaning up is still the one in roomRef.
            // This is important because another effect run might have already replaced roomRef.current
            if (roomRef.current === room) {
                roomRef.current = null; // This room is no longer the active one
            }
            room.removeAllListeners(); // Always remove listeners from the instance being cleaned up
            room.disconnect(true);    // Always disconnect the instance being cleaned up
        };
    // Only re-run this entire effect if the URL or Token changes, or initial loading completes.
    // The handlers (handleConnectionStateChange etc.) are memoized and their references
    // should be stable, so they shouldn't cause this effect to re-run unnecessarily.
    }, [liveKitUrl, liveKitToken, isLoadingStreamData,
        handleConnectionStateChange, handleTrackSubscribed,
        handleParticipantConnectedEvent, handleParticipantDisconnectedEvent
    ]);


    // UI Rendering
    if (isLoadingStreamData && !liveKitToken) {
        return <div style={{padding: '20px'}}><h1>Loading Stream Details & Token...</h1><p>Status: {statusMessage}</p></div>;
    }
    if (error && (!roomRef.current || roomRef.current?.state === ConnectionState.Failed || roomRef.current?.state === ConnectionState.Disconnected)) {
        return (
            <div style={{ padding: '20px', color: 'red' }}>
                <h1>Stream Error</h1><p>Status: {statusMessage}</p><p><strong>Error:</strong> {error}</p>
                <button onClick={() => window.location.reload()}>Try Again</button> <button onClick={() => navigate('/')}>Home</button>
            </div>
        );
    }
     if (!liveKitToken && !error && !isLoadingStreamData) {
        return <div style={{padding: '20px'}}><h1>Waiting for connection details...</h1><p>Status: {statusMessage}</p></div>;
    }

    return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif', color: 'white', backgroundColor: '#111' }}>
            <button onClick={() => navigate('/')} style={{marginBottom: '10px'}}>Back to Home</button>
            <h1>Minimal Stream Page (ID: {streamId})</h1>
            <p><strong>User:</strong> {currentUser ? currentUser.username : 'Guest'}
               {isCurrentUserStreamer ? ' (You are Streamer)' : ' (You are Viewer)'}
            </p>
            <p><strong>LiveKit Status:</strong> {statusMessage}</p>
            {error && <p style={{ color: 'red' }}><strong>Error:</strong> {error}</p>}

            <div style={{ marginTop: '20px', borderTop: '1px solid #333', paddingTop: '10px' }}>
                <h3>Video Area:</h3>
                {isCurrentUserStreamer && localParticipant && (
                    <ParticipantView participant={localParticipant} isLocal={true} participantType="LocalStreamer" />
                )}
                {!isCurrentUserStreamer && streamerParticipant && (
                    <ParticipantView participant={streamerParticipant} isLocal={false} participantType="RemoteStreamer" />
                )}
                {!isCurrentUserStreamer && !streamerParticipant && roomRef.current?.state === ConnectionState.Connected && (
                    <p>Waiting for streamer's video...</p>
                )}
                 {(roomRef.current?.state === ConnectionState.Connecting || roomRef.current?.state === ConnectionState.Reconnecting) && (
                    <p>Attempting to connect to LiveKit server...</p>
                )}
                 {roomRef.current?.state === ConnectionState.Failed && (
                    <p style={{color: 'orange'}}>Connection attempt failed. Check console.</p>
                )}
            </div>
        </div>
    );
}
export default MinimalStreamPage;