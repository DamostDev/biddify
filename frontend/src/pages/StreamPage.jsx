// frontend/src/pages/StreamPage.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Room, RoomEvent, ConnectionState, Track, DataPacket_Kind,
    LogLevel,
} from 'livekit-client';
import { FiMessageSquare } from 'react-icons/fi';

import useAuthStore from '../services/authStore.js';
import streamService from '../services/streamService.js';

import StreamVideoPlayer from '../components/stream/StreamVideoPlayer';
import StreamChat from '../components/stream/StreamChat';
import StreamProductList from '../components/stream/StreamProductList';
import StreamAuctionControls from '../components/stream/StreamAuctionControls';
import StreamHeader from '../components/stream/StreamHeader';

import chatService from '../services/chatService.js';


function StreamPage() {
    const { streamId } = useParams();
    const navigate = useNavigate();
    const { user: currentUser, isAuthenticated } = useAuthStore();

    // ... (all existing state and refs remain the same)
    const [streamDataFromAPI, setStreamDataFromAPI] = useState(null);
    const [mainParticipant, setMainParticipant] = useState(null);
    const [localParticipantState, setLocalParticipantState] = useState(null);
    const [isCurrentUserStreamer, setIsCurrentUserStreamer] = useState(false);
    const [statusMessage, setStatusMessage] = useState('Idle');
    const [error, setError] = useState(null);
    const [isLoadingStreamData, setIsLoadingStreamData] = useState(true);
    const [liveKitToken, setLiveKitToken] = useState(null);
    const [liveKitUrl, setLiveKitUrl] = useState(null);
    const [canPlaybackAudio, setCanPlaybackAudio] = useState(true);

    const [chatMessages, setChatMessages] = useState([]);
    const [isLocalAudioMuted, setIsLocalAudioMuted] = useState(false);
    const [isRemoteAudioMuted, setIsRemoteAudioMuted] = useState(false);
    const [activeTab, setActiveTab] = useState('chat');

    const roomRef = useRef(null);
    const isCurrentUserStreamerRef = useRef(isCurrentUserStreamer);

    useEffect(() => {
        if (streamId && !isLoadingStreamData && streamDataFromAPI) { // Ensure stream data is loaded before fetching chat
            const fetchHistory = async () => {
                console.log('[StreamPage] Fetching chat history for stream:', streamId);
                try {
                    const history = await chatService.getChatMessages(streamId);
                    // Transform fetched history to match the structure LiveKit messages will have
                    const formattedHistory = history.map(msg => ({
                        id: `db-${msg.message_id}`, // Distinguish from live messages if needed
                        user: {
                            username: msg.User?.username || msg.username_at_send_time,
                            avatar: msg.User?.profile_picture_url || msg.avatar_url_at_send_time,
                            isMod: false, // Determine if you store/derive this
                            identity: `user-${msg.user_id}`, // Construct if needed
                        },
                        text: msg.message_text,
                        timestamp: msg.sent_at,
                    }));
                    setChatMessages(formattedHistory);
                    console.log('[StreamPage] Chat history loaded:', formattedHistory);
                } catch (err) {
                    console.error("Failed to fetch chat history:", err);
                    // Optionally set an error state for chat history
                }
            };
            fetchHistory();
        }
    }, [streamId, isLoadingStreamData, streamDataFromAPI]);

    useEffect(() => {
        isCurrentUserStreamerRef.current = isCurrentUserStreamer;
    }, [isCurrentUserStreamer]);

    const safeParseMetadata = useCallback((metadataString) => {
        if (!metadataString) return {};
        try { return JSON.parse(metadataString); }
        catch (e) { console.warn("Failed to parse metadata:", metadataString, e); return {}; }
    }, []);

    useEffect(() => {
        // ... (init effect remains the same)
        if (!streamId) { setError("Stream ID is missing."); setIsLoadingStreamData(false); return; }
        let isMounted = true;
        setIsLoadingStreamData(true); setStatusMessage("Fetching stream details..."); setError(null);
        setLiveKitToken(null); setLiveKitUrl(null); setStreamDataFromAPI(null);

        const init = async () => {
            try {
                const apiStreamDataResponse = await streamService.getStreamDetails(streamId);
                if (!isMounted) return;
                setStreamDataFromAPI(apiStreamDataResponse);

                const userIsStreamerCheck = currentUser?.user_id === apiStreamDataResponse.user_id;
                setIsCurrentUserStreamer(userIsStreamerCheck);

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
                            console.log("[USER 2 - TOKEN] Received token:", tokenResponse.token); // Log the token
                    setLiveKitToken(tokenResponse.token);
                    setLiveKitUrl(tokenResponse.livekitUrl);
                } else {
                    throw new Error(tokenResponse?.message || "Failed to get LiveKit token/URL.");
                }
            } catch (err) {
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

    const handleNewStreamerCandidate = useCallback((participant) => {
        // ... (remains the same)
        if (!participant || !roomRef.current || isCurrentUserStreamerRef.current) return;
        const meta = safeParseMetadata(participant.metadata);
        if (meta.role === 'streamer' || participant.identity.includes('-streamer-')) {
            setMainParticipant(prev => (!prev || prev.sid !== participant.sid ? participant : prev));
        }
    }, [safeParseMetadata]);

    const handleConnectionStateChange = useCallback(async (connectionState) => {
        // ... (remains the same)
        if (!roomRef.current) return;
        const currentRoom = roomRef.current;

            console.log(`[CONNECTION STATE CHANGE] State: ${connectionState}, Current Room SID: ${currentRoom.sid}, Room Name: ${currentRoom.name}`);
        
        setStatusMessage(`LiveKit: ${connectionState}`);
        setCanPlaybackAudio(currentRoom.canPlaybackAudio);

        if (connectionState === ConnectionState.Connected) {

        console.log(
            `%c[ACTUALLY CONNECTED EVENT] Room: ${currentRoom.name}, SID: ${currentRoom.sid}, LocalParticipant ID: ${currentRoom.localParticipant.identity}`,
            'color: #28a745; font-weight: bold;'
        );

             console.log(
        `%c[USER 2 - CONNECTED] Room: ${currentRoom.name}, SID: ${currentRoom.sid}, LocalParticipant ID: ${currentRoom.localParticipant.identity}`,
        'color: #28a745; font-weight: bold;'
    );
    setStatusMessage(`LiveKit: Connected to ${currentRoom.name}`);
    setLocalParticipantState(currentRoom.localParticipant);

    // Log remote participants to see if User 1 (streamer) is visible to User 2
    console.log('[USER 2 - CONNECTED] Remote participants now:', Array.from(currentRoom.remoteParticipants.keys()));
    currentRoom.remoteParticipants.forEach(p => {
        console.log(`[ACTUALLY CONNECTED EVENT] Remote P: ${p.identity}, SID: ${p.sid}, Meta: ${p.metadata}`);
             handleNewStreamerCandidate(p);
        console.log(`[USER 2 - CONNECTED] Remote P: ${p.identity}, SID: ${p.sid}, Meta: ${p.metadata}`);
        handleNewStreamerCandidate(p); // Ensure this runs for existing remotes
    });
            setLocalParticipantState(currentRoom.localParticipant);
            currentRoom.remoteParticipants.forEach(p => handleNewStreamerCandidate(p));
            if (isCurrentUserStreamerRef.current && currentRoom.localParticipant) {
                setMainParticipant(currentRoom.localParticipant);
                try {
                    await currentRoom.localParticipant.setCameraEnabled(true);
                    await currentRoom.localParticipant.setMicrophoneEnabled(!isLocalAudioMuted);
                } catch (mediaError) {
                    setError(prev => `${prev || ''} Media Error: ${mediaError.message}.`);
                }
            }
        } else if (connectionState === ConnectionState.Disconnected) {
            console.log(`[DISCONNECTED EVENT] Room SID was: ${currentRoom.sid}`);
            setLocalParticipantState(null); setMainParticipant(null);
        } else if (connectionState === ConnectionState.Failed) {
            console.error(`[CONNECTION FAILED EVENT] Room SID was: ${currentRoom.sid}`);
            setError(prev => `${prev || ''} LiveKit connection failed.`);
        }
    }, [handleNewStreamerCandidate, isLocalAudioMuted]);

    const handleTrackSubscribed = useCallback((track, publication, remoteParticipant) => {
        // ... (remains the same)
        if (!isCurrentUserStreamerRef.current) {
             handleNewStreamerCandidate(remoteParticipant);
        }
    }, [handleNewStreamerCandidate]);

    const handleParticipantConnectedEvent = useCallback((participant) => {
        // ... (remains the same)
        if (!isCurrentUserStreamerRef.current) {
            handleNewStreamerCandidate(participant);
        }
    }, [handleNewStreamerCandidate]);

    const handleParticipantDisconnectedEvent = useCallback((participant) => {
        // ... (remains the same)
        setMainParticipant(prevStreamer => (prevStreamer?.sid === participant.sid ? null : prevStreamer));
    }, []);

    const handleDataReceived = useCallback((payload, participant) => {
            console.log(
        `%c[USER 2 - RAW DATA RECEIVED] From SID: ${participant?.sid}, Identity: ${participant?.identity}. Payload: ${new TextDecoder().decode(payload)}`,
        'color: orange; font-weight: bold;'
    );
        // ... (remains the same, with logs)
        console.log(`[DATA RECEIVED from ${participant?.identity} by ${roomRef.current?.localParticipant?.identity}]:`, new TextDecoder().decode(payload));
   
        
        try {
            const messageData = JSON.parse(new TextDecoder().decode(payload));
            if (messageData.type === 'chat') {

                console.log('[StreamPage on Receiver] Parsed chat messageData:', messageData);                setChatMessages(prevMessages => {
                    
                    const newMessages = [...prevMessages, {
                        id: `msg-${participant.sid}-${Date.now()}`,
                        user: {
                            username: messageData.username,
                            avatar: messageData.avatar,
                            isMod: safeParseMetadata(participant?.metadata).role === 'moderator',
                            identity: participant.identity,
                        },
                        text: messageData.text,
                        timestamp: messageData.timestamp,
                        highlight: messageData.highlight || false,
                    }];
                    console.log('[StreamPage on Receiver] Updated chatMessages state. New array length:', newMessages.length, 'New array content:', newMessages);                  return newMessages;
                });
            } else {
                console.log('[StreamPage] Received data packet of unknown type:', messageData.type);
            }
        } catch (e) {
            console.error('[StreamPage] Error processing received data message:', e, 'Raw payload:', new TextDecoder().decode(payload));
        }
    }, [safeParseMetadata]);

    const handleAudioPlaybackChange = useCallback(() => {
        // ... (remains the same)
        if (roomRef.current) {
            setCanPlaybackAudio(roomRef.current.canPlaybackAudio);
            if (roomRef.current.canPlaybackAudio) {
                setStatusMessage(prev => prev.replace(" (Audio muted, click page to enable)", ""));
            } else {
                 setStatusMessage(prev => prev.includes("Audio muted") ? prev : prev + " (Audio muted, click page to enable)");
            }
        }
    },[]);

    useEffect(() => {
        // ... (LiveKit connection effect remains the same, with logs)
        if (!liveKitUrl || !liveKitToken || isLoadingStreamData) {
            console.log(`[StreamPage EFFECT - LiveKit] SKIPPING: Conditions not met. URL: ${!!liveKitUrl}, Token: ${!!liveKitToken}, isLoading: ${isLoadingStreamData}`);
            return;
        }
        const room = new Room({ logLevel: LogLevel.info, adaptiveStream: true, dynacast: true });
        roomRef.current = room;
        console.log(`[StreamPage EFFECT - LiveKit] CREATED NEW ROOM INSTANCE. SID will be assigned on connect.`);

        console.log('[StreamPage EFFECT - LiveKit] Attaching LiveKit room listeners...');
        room.on(RoomEvent.ConnectionStateChanged, handleConnectionStateChange);
        room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
        room.on(RoomEvent.ParticipantConnected, handleParticipantConnectedEvent);
        room.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnectedEvent);
        room.on(RoomEvent.DataReceived, handleDataReceived);
        room.on(RoomEvent.AudioPlaybackStatusChanged, handleAudioPlaybackChange);
        console.log('[StreamPage EFFECT - LiveKit] All listeners attached.');

        room.connect(liveKitUrl, liveKitToken)
            .then(() => {
                console.log('[StreamPage EFFECT - LiveKit] room.connect() promise resolved. Room state:', room.state, 'Room SID:', room.sid);
            })
            .catch(err => {
                console.error("[StreamPage EFFECT - LiveKit] room.connect() promise REJECTED:", err);
                setError(prev => `${prev || ''} LiveKit Connection Init Failed: ${err.message}`);
                setStatusMessage("Error: Connection Init Failed");
                if (roomRef.current === room) {
                    room.removeAllListeners();
                    room.disconnect(true);
                    roomRef.current = null;
                }
            });

        return () => {
            console.log("[StreamPage EFFECT - LiveKit] CLEANUP: Disconnecting room SID:", room?.sid);
            if (roomRef.current === room) {
                roomRef.current = null;
            }
            room.removeAllListeners();
            room.disconnect(true);
        };
    }, [
        liveKitUrl, liveKitToken, isLoadingStreamData,
        handleConnectionStateChange, handleTrackSubscribed, handleParticipantConnectedEvent,
        handleParticipantDisconnectedEvent, handleDataReceived, handleAudioPlaybackChange
    ]);

    // ========================================================================
    // MOVED THESE FUNCTION DEFINITIONS *ABOVE* THE MAIN RETURN STATEMENT
    // ========================================================================
    const handleToggleLocalAudioMute = useCallback(async () => {
        if (!roomRef.current?.localParticipant || !isCurrentUserStreamerRef.current) return;
        const newMutedState = !isLocalAudioMuted;
        try {
            await roomRef.current.localParticipant.setMicrophoneEnabled(!newMutedState);
            setIsLocalAudioMuted(newMutedState);
        } catch (err) { console.error("Error toggling microphone:", err); }
    }, [isLocalAudioMuted]); // isCurrentUserStreamerRef is a ref, no need to list as dep

    const handleToggleRemoteAudioMute = useCallback(() => {
        // isCurrentUserStreamerRef is used here correctly
        if (!isCurrentUserStreamerRef.current) setIsRemoteAudioMuted(prev => !prev);
    }, []); // isCurrentUserStreamerRef is a ref, no need to list as dep

    const sendChatMessage = useCallback(async (text) => { // Make it async
        if (!roomRef.current?.localParticipant || !text.trim() || !currentUser || !streamId) {
            console.warn("Cannot send chat: Missing critical data.", {
                hasLocalP: !!roomRef.current?.localParticipant, text, currentUser, streamId
            });
            return;
        }

        const clientTimestamp = new Date().toISOString();
        const messageDataForLiveKit = {
            type: 'chat',
            text: text.trim(),
            username: currentUser.username,
            avatar: currentUser.profile_picture_url,
            timestamp: clientTimestamp,
        };

        // 1. Publish to LiveKit for real-time display to other users
        try {
            const encodedPayload = new TextEncoder().encode(JSON.stringify(messageDataForLiveKit));
            await roomRef.current.localParticipant.publishData(encodedPayload, DataPacket_Kind.RELIABLE);
            console.log('[StreamPage sendChatMessage] LiveKit publishData successful.');
        } catch (e) {
            console.error("[StreamPage sendChatMessage] Failed to send chat message via LiveKit:", e);
            // Decide if you still want to save to DB if LiveKit fails. For now, we'll let it try.
        }

        // 2. Save to Database via Backend API
        try {
            const messagePayloadForDB = {
                text: messageDataForLiveKit.text,
                client_timestamp: clientTimestamp,
                // Backend will use req.user for user_id and username/avatar
            };
            // We don't necessarily need to wait for this to complete for UI update if relying on LiveKit
            chatService.saveChatMessage(streamId, messagePayloadForDB)
                .then(savedMessage => {
                    console.log('[StreamPage sendChatMessage] Message saved to DB:', savedMessage);
                    // Optionally, you could update the local message with the DB ID if needed,
                    // but for simplicity, LiveKit + optimistic update handles UI.
                })
                .catch(dbError => {
                    console.error("[StreamPage sendChatMessage] Failed to save chat message to DB:", dbError);
                    // Handle this error, maybe notify user that message might not be permanently saved
                });
        } catch (dbError) { // Should be caught by .catch above, but for safety
            console.error("[StreamPage sendChatMessage] Error preparing to save chat message to DB:", dbError);
        }

        // 3. Optimistic UI update for the sender
        setChatMessages(prevMessages => {
             const optimisticMessage = {
                id: `local-${Date.now()}`, // Temporary ID for local rendering
                user: {
                    username: currentUser.username,
                    avatar: currentUser.profile_picture_url,
                    isMod: false, // Determine if current user is mod if applicable
                    identity: roomRef.current.localParticipant.identity,
                },
                text: messageDataForLiveKit.text,
                timestamp: messageDataForLiveKit.timestamp,
            };
            console.log('[StreamPage sendChatMessage] Optimistic UI update for sender');
            return [...prevMessages, optimisticMessage];
        });
    }, [currentUser, streamId]);
    // ========================================================================
    // END OF MOVED FUNCTIONS
    // ========================================================================


    const handleRetryConnection = useCallback(() => {
        setError(null); setStatusMessage("Retrying...");
        setIsLoadingStreamData(true); setLiveKitToken(null); setLiveKitUrl(null);
        if (roomRef.current) { roomRef.current.disconnect(true); roomRef.current = null; }
    }, []);


    // Loading and Error states UI
    if (isLoadingStreamData && !liveKitToken) {
        // ... (loading UI)
        return (
            <div className="flex h-screen items-center justify-center bg-black">
                <span className="loading loading-lg loading-dots text-white"></span>
                <p className="ml-4 text-white">Loading Stream and Token...</p>
                <p className="text-xs text-neutral-400">Status: {statusMessage}</p>
            </div>
        );
    }

    if (error && (!roomRef.current || roomRef.current?.state === ConnectionState.Failed || roomRef.current?.state === ConnectionState.Disconnected )) {
        // ... (error UI)
        return (
            <div className="flex flex-col h-screen items-center justify-center bg-neutral-900 text-white p-4 text-center">
                <h2 className="text-2xl font-semibold text-red-500 mb-4">Stream Error</h2>
                <p className="mb-1 text-sm">Current Status: {statusMessage}</p>
                <p className="mb-6 max-w-md text-red-400">{error}</p>
                <div className="space-x-4">
                    <button onClick={handleRetryConnection} className="btn btn-warning">Try Again</button>
                    <button onClick={() => navigate('/')} className="btn btn-primary">Go Home</button>
                </div>
            </div>
        );
    }
     if (!liveKitToken && !error && !isLoadingStreamData) {
        // ... (waiting for connection details UI)
        return (
            <div className="flex h-screen items-center justify-center bg-black">
                <p className="text-white">Waiting for connection details... Stream might not be active or an issue occurred.</p>
                <p className="text-xs text-neutral-400">Status: {statusMessage}</p>
                 <button onClick={handleRetryConnection} className="btn btn-sm btn-outline btn-warning ml-4">Retry</button>
            </div>
        );
    }

    const participantForVideoPlayer = isCurrentUserStreamer ? localParticipantState : mainParticipant;
    const streamHeaderProps = {
        id: streamDataFromAPI?.stream_id,
        title: streamDataFromAPI?.title,
        host: streamDataFromAPI?.User || { username: 'Streamer', avatarUrl: '', rating: 0, isFollowed: false },
        viewerCount: (roomRef.current?.remoteParticipants?.size || 0) + (roomRef.current?.localParticipant ? 1 : 0),
        streamUrl: window.location.href,
    };
    const currentAuctionProductData = streamDataFromAPI?.auctions?.[0]?.Product ? {
        name: streamDataFromAPI.auctions[0].Product.title,
        imageUrl: streamDataFromAPI.auctions[0].Product.images?.[0]?.image_url || 'https://via.placeholder.com/80',
        condition: streamDataFromAPI.auctions[0].Product.condition,
        shippingInfo: "Ships in 2-3 days", // Placeholder
        bids: streamDataFromAPI.auctions[0].bid_count || 0,
        currentBid: streamDataFromAPI.auctions[0].current_price || streamDataFromAPI.auctions[0].starting_price || 0,
        timeLeft: "00:00", // Placeholder, needs dynamic update
    } : null;


    return (
        <div className="flex flex-col h-screen bg-neutral-900 text-white overflow-hidden"
             onClick={() => {
                if (roomRef.current && !roomRef.current.canPlaybackAudio) {
                    console.log('[StreamPage] Attempting to start audio on user interaction.');
                    roomRef.current.startAudio().catch(e => console.warn("Error starting audio on click", e));
                }
             }}
        >
            <StreamHeader streamData={streamHeaderProps} />

            <div className="flex flex-1 overflow-hidden">
                <aside className="hidden md:flex flex-col w-72 lg:w-80 xl:w-96 bg-black border-r border-neutral-800 overflow-y-auto">
                    <StreamProductList
                        streamTitle={streamDataFromAPI?.title || "Products"}
                        products={streamDataFromAPI?.auctions?.map(auc => auc.Product).filter(Boolean) || []} // Example products based on auctions
                    />
                </aside>

                <div className="flex-1 flex items-center justify-center bg-black overflow-hidden px-0 md:px-4 py-0 md:py-4">
                    <StreamVideoPlayer
                        mainParticipant={participantForVideoPlayer}
                        isLocalStreamer={isCurrentUserStreamer && participantForVideoPlayer === localParticipantState}
                        isAudioMuted={isCurrentUserStreamer ? isLocalAudioMuted : isRemoteAudioMuted}
                        onToggleAudioMute={isCurrentUserStreamer ? handleToggleLocalAudioMute : handleToggleRemoteAudioMute}
                        thumbnailUrl={streamDataFromAPI?.thumbnail_url || "https://via.placeholder.com/900x1600.png?text=Stream+Offline"}
                        currentAuctionOnVideo={currentAuctionProductData}
                    />
                </div>

                <aside className={`w-full md:w-80 lg:w-96 bg-black border-l border-neutral-800 
                                 flex flex-col overflow-hidden 
                                 fixed bottom-0 left-0 h-[50vh] md:h-full md:static 
                                 transform ${activeTab === 'chat-visible-mobile' ? 'translate-y-0' : 'translate-y-full'} md:translate-y-0 
                                 transition-transform duration-300 ease-in-out z-20`}
                >
                    {currentAuctionProductData && (
                        <div className="shrink-0">
                            <StreamAuctionControls product={currentAuctionProductData} />
                        </div>
                    )}
                    <div className="flex-grow overflow-y-auto">
                        <StreamChat
                            messages={chatMessages}
                            activeTab={activeTab}
                            onTabChange={setActiveTab}
                            viewerCount={streamHeaderProps.viewerCount}
                            onSendMessage={sendChatMessage}
                            localParticipantIdentity={roomRef.current?.localParticipant?.identity}
                        />
                    </div>
                </aside>
            </div>

            {!canPlaybackAudio && roomRef.current?.state === ConnectionState.Connected && (
                <div className="fixed bottom-16 md:bottom-4 left-1/2 -translate-x-1/2 bg-yellow-500 text-black px-4 py-2 rounded-md text-sm z-50 shadow-lg animate-pulse">
                    Tap/Click page to enable audio
                </div>
            )}
            <div className="md:hidden fixed bottom-4 right-4 z-30">
                <button
                    onClick={() => setActiveTab(prev => prev === 'chat-visible-mobile' ? 'chat' : 'chat-visible-mobile')}
                    className="btn btn-neutral btn-circle shadow-lg"
                >
                    <FiMessageSquare size={20} />
                </button>
            </div>
        </div>
    );
}
export default StreamPage;