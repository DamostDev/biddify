// src/pages/MinimalStreamPage.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Room, RoomEvent, ConnectionState, Track,
    LogLevel, // For detailed debugging
    LocalParticipant, RemoteParticipant
} from 'livekit-client';
import useAuthStore from '../services/authStore.js'; // Ensure path is correct
import streamService from '../services/streamService.js'; // Ensure path is correct

// Simplified ParticipantView for this minimal example
const MinimalParticipantView = ({ participant, isLocal }) => {
    const videoRef = useRef(null);
    const audioRef = useRef(null);

    useEffect(() => {
        if (!participant) return;

        const videoEl = videoRef.current;
        const audioEl = audioRef.current;

        const handleTrackSubscribed = (track) => {
            if (track.kind === Track.Kind.Video) {
                track.attach(videoEl);
            } else if (track.kind === Track.Kind.Audio && !isLocal) {
                track.attach(audioEl);
            }
        };

        const handleTrackUnsubscribed = (track) => {
            track.detach(videoEl);
            track.detach(audioEl);
        };

        // Handle already published tracks
        participant.videoTrackPublications.forEach(pub => {
            if (pub.track && pub.isSubscribed) handleTrackSubscribed(pub.track);
        });
        participant.audioTrackPublications.forEach(pub => {
            if (pub.track && pub.isSubscribed) handleTrackSubscribed(pub.track);
        });
        
        console.log('[mohamed] Verifying Track import:', Track); // <--- ADD THIS
        console.log('[mohamed] Verifying Track.Event:', Track?.Event); 

        participant.on(Track.Event.TrackSubscribed, handleTrackSubscribed);
        participant.on(Track.Event.TrackUnsubscribed, handleTrackUnsubscribed);

        return () => {
            participant.off(Track.Event.TrackSubscribed, handleTrackSubscribed);
            participant.off(Track.Event.TrackUnsubscribed, handleTrackUnsubscribed);
            participant.videoTrackPublications.forEach(pub => pub.track?.detach(videoEl));
            participant.audioTrackPublications.forEach(pub => pub.track?.detach(audioEl));
        };
    }, [participant, isLocal]);

    if (!participant) return null;

    return (
        <div style={{ border: '2px solid green', padding: '10px', margin: '10px', width: '400px', height: '300px', backgroundColor: 'black' }}>
            <p style={{ color: 'white' }}>{participant.identity} {isLocal ? '(You - Streamer)' : '(Remote)'}</p>
            <video ref={videoRef} width="100%" height="80%" autoPlay playsInline muted={isLocal} style={{ objectFit: 'contain' }} />
            {!isLocal && <audio ref={audioRef} autoPlay playsInline />}
        </div>
    );
};


function MinimalStreamPage() {
    const { streamId } = useParams();
    const navigate = useNavigate();
    const { user: currentUser, isAuthenticated } = useAuthStore();

    const [room, setRoom] = useState(null);
    const [streamerParticipant, setStreamerParticipant] = useState(null);
    const [localParticipant, setLocalParticipant] = useState(null);
    const [isCurrentUserStreamer, setIsCurrentUserStreamer] = useState(false);

    const [status, setStatus] = useState('Idle'); // More detailed status
    const [error, setError] = useState('');

    const livekitConnectionDetailsRef = useRef(null);

    const safeParseMetadata = (metadataString) => {
        let meta = {};
        if (!metadataString) return meta;
        try { meta = JSON.parse(metadataString); }
        catch (e) { console.warn("Failed to parse metadata:", metadataString, e); }
        return meta;
    };

    // --- LiveKit Event Handlers ---
    const handleNewStreamer = useCallback((participant) => {
        const meta = safeParseMetadata(participant.metadata);
        if (meta.role === 'streamer') {
            console.log('[MinimalPage] New or existing streamer identified:', participant.identity);
            setStreamerParticipant(participant);
        }
    }, []);

    const handleParticipantConnected = useCallback((participant) => {
        console.log('[MinimalPage] Participant Connected:', participant.identity);
        handleNewStreamer(participant);
    }, [handleNewStreamer]);

    const handleParticipantDisconnected = useCallback((participant) => {
        console.log('[MinimalPage] Participant Disconnected:', participant.identity);
        if (streamerParticipant?.sid === participant.sid) {
            console.log('[MinimalPage] Streamer participant disconnected.');
            setStreamerParticipant(null);
        }
    }, [streamerParticipant]);
    
    const handleTrackSubscribed = useCallback((track, publication, participant) => {
        console.log(`[MinimalPage] Track Subscribed: ${track.kind} for ${participant.identity}`);
        // If this is the streamer's video track, ensure they are set as streamerParticipant
        const meta = safeParseMetadata(participant.metadata);
        if (meta.role === 'streamer' && track.kind === Track.Kind.Video) {
             if (!streamerParticipant || streamerParticipant.sid !== participant.sid) {
                console.log('[MinimalPage] Streamer identified via track subscription:', participant.identity);
                setStreamerParticipant(participant);
             }
        }
    }, [streamerParticipant]);


    // --- Initialization: Fetch Stream Data & LiveKit Token ---
    useEffect(() => {
        if (!streamId) {
            setError("Stream ID is missing.");
            setStatus("Error");
            return;
        }
        let isMounted = true;
        setStatus("Fetching stream details...");
        setError('');
        livekitConnectionDetailsRef.current = null;

        console.log(`[MinimalPage EFFECT 1] streamId: ${streamId}`);

        const init = async () => {
            try {
                const apiStreamData = await streamService.getStreamDetails(streamId);
                console.log("[MinimalPage EFFECT 1] Got apiStreamData:", apiStreamData);
                if (!isMounted) return;

                const userIsStreamer = currentUser?.user_id === apiStreamData.user_id;
                setIsCurrentUserStreamer(userIsStreamer);
                console.log("[MinimalPage EFFECT 1] User is streamer:", userIsStreamer);

                setStatus(userIsStreamer ? "Fetching streamer token..." : "Fetching viewer token...");
                let tokenResponse;
                if (userIsStreamer) {
                    if (!isAuthenticated) throw new Error("Login required to start stream.");
                    tokenResponse = await streamService.goLiveStreamer(streamId);
                } else {
                    tokenResponse = await streamService.joinLiveStreamViewer(streamId);
                }
                console.log("[MinimalPage EFFECT 1] Got tokenResponse:", tokenResponse);
                if (!isMounted) return;

                if (tokenResponse && tokenResponse.token && tokenResponse.livekitUrl) {
                    livekitConnectionDetailsRef.current = {
                        token: tokenResponse.token,
                        url: tokenResponse.livekitUrl,
                    };
                    setStatus("Token acquired. Ready to connect.");
                } else {
                    throw new Error(tokenResponse?.message || "Failed to get LiveKit token.");
                }
            } catch (err) {
                console.error("[MinimalPage EFFECT 1] Init Error:", err);
                if (isMounted) {
                    setError(err?.response?.data?.message || err?.message || "Failed to load stream.");
                    setStatus("Error");
                }
            }
        };
        init();
        return () => { isMounted = false; };
    }, [streamId, currentUser, isAuthenticated]);


    // --- LiveKit Room Connection & Management ---
    useEffect(() => {
        console.log(`[MinimalPage EFFECT 2] Triggered. Connection details:`, livekitConnectionDetailsRef.current, `Room:`, room, `Status:`, status);

        if (!livekitConnectionDetailsRef.current || room || status !== "Token acquired. Ready to connect.") {
            if (status !== "Token acquired. Ready to connect.") console.log("[MinimalPage EFFECT 2] Skipping: Not ready to connect or already connected/connecting. Status:", status);
            return;
        }

        const { token, url } = livekitConnectionDetailsRef.current;
        console.log(`[MinimalPage EFFECT 2] Attempting connect. URL: ${url}, Token: ${token ? 'VALID' : 'MISSING'}`);
        setStatus("Connecting to LiveKit...");

        const newRoom = new Room({
            logLevel: LogLevel.debug, // Maximize client logs
        });

        newRoom.on(RoomEvent.ConnectionStateChanged, (connectionState) => {
            console.log('[MinimalPage LK Event] Connection State Changed:', connectionState);
            setStatus(`LiveKit: ${connectionState}`);
            if (connectionState === ConnectionState.Connected) {
                setLocalParticipant(newRoom.localParticipant);
                // Check for existing streamer among already connected participants
                newRoom.remoteParticipants.forEach(p => handleNewStreamer(p));
            }
            if (connectionState === ConnectionState.Disconnected) {
                setRoom(null); // This will trigger cleanup
                setLocalParticipant(null);
                setStreamerParticipant(null);
                // setError("Disconnected from stream."); // Optional
            }
        });

        newRoom.on(RoomEvent.ParticipantConnected, handleParticipantConnected);
        newRoom.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
        newRoom.on(Track.Event.TrackSubscribed, handleTrackSubscribed); // Use Track.Event for TrackSubscribed

        newRoom.connect(url, token)
            .then(async (connectedRoomParam) => { // `connectedRoomParam` is the resolved Room instance
                console.log('[MinimalPage EFFECT 2] connect().then() - Received room object:', connectedRoomParam);
                if (!connectedRoomParam || typeof connectedRoomParam.name === 'undefined') {
                     console.error('[MinimalPage EFFECT 2] CRITICAL: connect() resolved but room object is invalid!', connectedRoomParam);
                     throw new Error("LiveKit connection resolved with an invalid room object.");
                }
                setRoom(connectedRoomParam); // Set the valid room instance
                setStatus(`LiveKit: Connected to ${connectedRoomParam.name}`);

                if (isCurrentUserStreamer) {
                    console.log("[MinimalPage EFFECT 2] Enabling media for streamer...");
                    try {
                        await connectedRoomParam.localParticipant.setCameraEnabled(true);
                        await connectedRoomParam.localParticipant.setMicrophoneEnabled(true); // Start unmuted
                        console.log("[MinimalPage EFFECT 2] Streamer media enabled.");
                        setStreamerParticipant(connectedRoomParam.localParticipant); // Streamer is their own main view
                    } catch (mediaError) {
                        console.error("[MinimalPage EFFECT 2] Error enabling media:", mediaError);
                        setError(`Media Error: ${mediaError.message}. Check permissions.`);
                        await connectedRoomParam.disconnect(true);
                    }
                }
            })
            .catch(err => {
                console.error("[MinimalPage EFFECT 2] connect() .catch() - Error:", err);
                setError(`LiveKit Connection Failed: ${err.message}`);
                setStatus("Error");
                setRoom(null); // Ensure room is cleared on connect failure
            });

        return () => {
            console.log("[MinimalPage EFFECT 2] Cleanup: Disconnecting room.");
            if (newRoom) {
                newRoom.disconnect(true).catch(e => console.warn("Error during disconnect cleanup:", e));
                newRoom.removeAllListeners();
            }
            setRoom(null); // Crucial for re-connection logic if component re-renders
        };
    }, [status, isCurrentUserStreamer, handleParticipantConnected, handleParticipantDisconnected, handleNewStreamer, handleTrackSubscribed]); // status dependency helps trigger connect when token is ready

    return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
            <button onClick={() => navigate('/')}>Back to Home</button>
            <h1>Minimal Stream Page (ID: {streamId})</h1>
            <p><strong>User:</strong> {currentUser ? currentUser.username : 'Guest'} {isCurrentUserStreamer ? '(You are the Streamer)' : '(You are a Viewer)'}</p>
            <p><strong>Page Status:</strong> {status}</p>
            {error && <p style={{ color: 'red' }}><strong>Error:</strong> {error}</p>}

            <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                {isCurrentUserStreamer && localParticipant && (
                    <MinimalParticipantView participant={localParticipant} isLocal={true} />
                )}
                {streamerParticipant && (!isCurrentUserStreamer || streamerParticipant.sid !== localParticipant?.sid) && (
                    <MinimalParticipantView participant={streamerParticipant} isLocal={false} />
                )}
            </div>
            {!streamerParticipant && !isCurrentUserStreamer && status.startsWith("LiveKit: Connected") && (
                <p>Waiting for streamer to connect or publish video...</p>
            )}
        </div>
    );
}

export default MinimalStreamPage;