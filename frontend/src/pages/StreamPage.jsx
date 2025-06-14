// frontend/src/pages/StreamPage.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    Room, RoomEvent, ConnectionState, Track, DataPacket_Kind,
    LogLevel,
} from 'livekit-client';
import { FiMessageSquare, FiAlertTriangle, FiArrowLeft } from 'react-icons/fi';

import useAuthStore from '../services/authStore.js';
import streamService from '../services/streamService.js';
import auctionService from '../services/auctionService.js';
import * as userService from '../services/userService.js';
import chatService from '../services/chatService.js';
import useEmotionStore from '../services/emotionStore.js';
import emotionService from '../services/emotionService.js';
import * as productService from '../services/productService.js';

import StreamVideoPlayer from '../components/stream/StreamVideoPlayer';
import StreamChat from '../components/stream/StreamChat';
import StreamProductList from '../components/stream/StreamProductList';
import StreamAuctionControls from '../components/stream/StreamAuctionControls';
// StreamHeader is now rendered inside StreamVideoPlayer
// import StreamHeader from '../components/stream/StreamHeader'; 
import StreamerAuctionPanel from '../components/stream/StreamerAuctionPanel';

// ... (EMOTIONS_LIST, safeParseMetadata remain the same)
const EMOTIONS_LIST = [
  'admiration', 'amusement', 'anger', 'annoyance', 'approval', 'caring',
  'confusion', 'curiosity', 'desire', 'disappointment', 'disapproval',
  'disgust', 'embarrassment', 'excitement', 'fear', 'gratitude', 'grief',
  'joy', 'love', 'nervousness', 'optimism', 'pride', 'realization',
  'relief', 'remorse', 'sadness', 'surprise', 'neutral'
];

const safeParseMetadata = (metadataString) => {
    if (!metadataString) return {};
    try { return JSON.parse(metadataString); }
    catch (e) { console.warn("Failed to parse metadata:", metadataString, e); return {}; }
};


function StreamPage() {
    const { streamId } = useParams();
    const navigate = useNavigate();
    const { user: currentUser, isAuthenticated } = useAuthStore();

    // ... (all existing state variables remain the same)
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
    const [isFollowingHost, setIsFollowingHost] = useState(false);
    const [roomParticipants, setRoomParticipants] = useState([]);
    const [analyzedMessageIds, setAnalyzedMessageIds] = useState(new Set());
    const [streamerOwnedProducts, setStreamerOwnedProducts] = useState([]);
    const [currentAuction, setCurrentAuction] = useState(null);
    const [isAuctionLoading, setIsAuctionLoading] = useState(false);
    const [auctionError, setAuctionError] = useState(null);
    const [followLoading, setFollowLoading] = useState(false);
    const [isEndingStream, setIsEndingStream] = useState(false); // New state for ending stream

    const roomRef = useRef(null);
    const isCurrentUserStreamerRef = useRef(isCurrentUserStreamer);

    useEffect(() => {
        isCurrentUserStreamerRef.current = isCurrentUserStreamer;
    }, [isCurrentUserStreamer]);

    // ... (updateRoomParticipantsList, handleNewStreamerCandidate, handleConnectionStateChange,
    //      handleTrackSubscribed, handleParticipantConnectedEvent, handleParticipantDisconnectedEvent,
    //      handleDataReceived, handleAudioPlaybackChange, sendLiveKitData, handleAuctionAction,
    //      handleToggleLocalAudioMute, handleToggleRemoteAudioMute, sendChatMessageViaLiveKit,
    //      handlePlaceBid, handleFollowToggle all remain the same)
    const updateRoomParticipantsList = useCallback((roomInstance) => {
        if (!roomInstance) return;
        const participants = [];
        if (roomInstance.localParticipant) {
            participants.push(roomInstance.localParticipant);
        }
        roomInstance.remoteParticipants.forEach(rp => participants.push(rp));
        setRoomParticipants(participants.map(p => ({
            sid: p.sid,
            identity: p.identity,
            name: p.name,
            metadata: safeParseMetadata(p.metadata)
        })));
    }, []);

    const handleNewStreamerCandidate = useCallback((participant) => {
        if (!participant || !roomRef.current || isCurrentUserStreamerRef.current) return;
        const meta = safeParseMetadata(participant.metadata);
        if (meta.role === 'streamer' || participant.identity.includes('-streamer-')) {
            setMainParticipant(prev => (!prev || prev.sid !== participant.sid ? participant : prev));
        }
    }, []);

    const handleConnectionStateChange = useCallback(async (connectionState, roomInstance) => {
        if (!roomInstance) return;
        setStatusMessage(`LiveKit: ${connectionState}`);
        setCanPlaybackAudio(roomInstance.canPlaybackAudio);
        if (connectionState === ConnectionState.Connected) {
            setLocalParticipantState(roomInstance.localParticipant);
            roomInstance.remoteParticipants.forEach(p => handleNewStreamerCandidate(p));
            updateRoomParticipantsList(roomInstance);
            if (isCurrentUserStreamerRef.current && roomInstance.localParticipant) {
                setMainParticipant(roomInstance.localParticipant);
                try {
                    await roomInstance.localParticipant.setCameraEnabled(true);
                    await roomInstance.localParticipant.setMicrophoneEnabled(!isLocalAudioMuted);
                } catch (mediaError) {
                    setError(prev => `${prev || ''} Media Error: ${mediaError.message}. Check permissions.`);
                }
            }
        } else if (connectionState === ConnectionState.Disconnected) {
            setLocalParticipantState(null); setMainParticipant(null);
            setRoomParticipants([]);
        } else if (connectionState === ConnectionState.Failed) {
            setError(prev => `${prev || ''} LiveKit connection failed.`);
        }
    }, [handleNewStreamerCandidate, isLocalAudioMuted, updateRoomParticipantsList]);

    const handleTrackSubscribed = useCallback((track, publication, remoteParticipant) => {
        if (!isCurrentUserStreamerRef.current) {
             handleNewStreamerCandidate(remoteParticipant);
        }
    }, [handleNewStreamerCandidate]);

    const handleParticipantConnectedEvent = useCallback((participant) => {
        if (!isCurrentUserStreamerRef.current) {
            handleNewStreamerCandidate(participant);
        }
        if (roomRef.current) updateRoomParticipantsList(roomRef.current);
    }, [handleNewStreamerCandidate, updateRoomParticipantsList]);

    const handleParticipantDisconnectedEvent = useCallback((participant) => {
        if (roomRef.current) updateRoomParticipantsList(roomRef.current);
        setMainParticipant(prevStreamer => {
            if (prevStreamer?.sid === participant.sid) return null;
            return prevStreamer;
        });
    }, [updateRoomParticipantsList]);

    const handleDataReceived = useCallback((payload, participant) => {
        try {
            const decodedPayload = new TextDecoder().decode(payload);
            const message = JSON.parse(decodedPayload);
            if (participant && participant.identity === roomRef.current?.localParticipant?.identity) return;
            if (message.senderIdentity === roomRef.current?.localParticipant?.identity) return;
            const eventSpecificPayload = message.payload;
            switch (message.type) {
                case 'CHAT_MESSAGE':
                    if (eventSpecificPayload && eventSpecificPayload.text) {
                        setChatMessages(prevMessages => {
                            const newMsg = {
                                id: `lk-${participant?.sid || 'unknown'}-${Date.now()}`,
                                user: {
                                    username: eventSpecificPayload.username, avatar: eventSpecificPayload.avatar,
                                    isMod: safeParseMetadata(participant?.metadata).role === 'moderator',
                                    identity: participant?.identity || message.senderIdentity,
                                },
                                text: eventSpecificPayload.text, timestamp: eventSpecificPayload.timestamp,
                            };
                            if (prevMessages.some(m => m.text === newMsg.text && m.user.identity === newMsg.user.identity && Math.abs(new Date(m.timestamp).getTime() - new Date(newMsg.timestamp).getTime()) < 2000)) {
                                return prevMessages;
                            }
                            return [...prevMessages, newMsg];
                        });
                    }
                    break;
                case 'AUCTION_STARTED':
                case 'AUCTION_UPDATED':
                case 'AUCTION_ENDED':
                    setCurrentAuction(eventSpecificPayload);
                    setAuctionError(null);
                    break;
                default:
                    console.warn('[LiveKit Data RECEIVED] Unknown message type:', message.type);
            }
        } catch (e) {
            console.error('[LiveKit Data RECEIVED] Error processing data message:', e);
        }
    }, []);

    const handleAudioPlaybackChange = useCallback((roomInstance) => {
        if (roomInstance) {
            setCanPlaybackAudio(roomInstance.canPlaybackAudio);
        }
    },[]);

    const sendLiveKitData = useCallback(async (type, payload) => {
        if (roomRef.current && roomRef.current.localParticipant) {
            try {
                const dataToSend = { type, payload, senderIdentity: roomRef.current.localParticipant.identity };
                const encodedPayload = new TextEncoder().encode(JSON.stringify(dataToSend));
                await roomRef.current.localParticipant.publishData(encodedPayload, DataPacket_Kind.RELIABLE);
            } catch (e) {
                console.error(`[LiveKit Data SEND ERROR] Type: ${type}`, e);
            }
        }
    }, []);

    const handleAuctionAction = useCallback((action) => {
        if (action.type === 'AUCTION_STARTED') {
            const actualAuctionObject = action.payload.auction || action.payload; // Adapt if payload structure varies
            setCurrentAuction(actualAuctionObject);
            setAuctionError(null);
            sendLiveKitData('AUCTION_STARTED', actualAuctionObject);
        }
    }, [sendLiveKitData]);

    const handleToggleLocalAudioMute = useCallback(async () => {
        if (!roomRef.current?.localParticipant || !isCurrentUserStreamerRef.current) return;
        const newMutedState = !isLocalAudioMuted;
        await roomRef.current.localParticipant.setMicrophoneEnabled(!newMutedState);
        setIsLocalAudioMuted(newMutedState);
    }, [isLocalAudioMuted]);

    const handleToggleRemoteAudioMute = useCallback(() => {
        if (!isCurrentUserStreamerRef.current) {
            setIsRemoteAudioMuted(prev => !prev);
        }
    }, []);

    const sendChatMessageViaLiveKit = useCallback(async (text) => {
        if (!roomRef.current?.localParticipant || !text.trim() || !currentUser || !streamId) return;
        const clientTimestamp = new Date().toISOString();
        const chatPayload = {
            text: text.trim(),
            username: currentUser.username,
            avatar: currentUser.profile_picture_url,
            timestamp: clientTimestamp,
        };
        sendLiveKitData('CHAT_MESSAGE', chatPayload);
        setChatMessages(prev => [...prev, {
            id: `local-${Date.now()}`,
            user: {
                username: currentUser.username,
                avatar: currentUser.profile_picture_url,
                identity: roomRef.current.localParticipant.identity,
                isMod: false,
            },
            text: chatPayload.text,
            timestamp: clientTimestamp,
        }]);
        try {
            await chatService.saveChatMessage(streamId, { text: chatPayload.text, client_timestamp: clientTimestamp });
        } catch (dbError) {
            console.error("[StreamPage] Failed to save chat message to DB:", dbError);
        }
    }, [currentUser, streamId, sendLiveKitData]);

    const handlePlaceBid = useCallback(async (auctionId, amount) => {
        if (!currentUser || isCurrentUserStreamerRef.current || !currentAuction || currentAuction.status !== 'active') {
            setAuctionError("Cannot place bid.");
            return;
        }
        setIsAuctionLoading(true);
        setAuctionError(null);
        try {
            const bidResult = await auctionService.placeBid(auctionId, amount);
            if (bidResult && bidResult.auction) {
                setCurrentAuction(bidResult.auction);
                sendLiveKitData('AUCTION_UPDATED', bidResult.auction);
            }
        } catch (err) {
            setAuctionError(err.message || "Failed to place bid.");
        } finally {
            setIsAuctionLoading(false);
        }
    }, [currentUser, currentAuction, sendLiveKitData]);

    const handleFollowToggle = useCallback(async () => {
        if (!currentUser || !streamDataFromAPI?.User || followLoading) return;
        setFollowLoading(true);
        const hostId = streamDataFromAPI.User.user_id;
        try {
            if (isFollowingHost) {
                await userService.unfollowUser(hostId);
                setIsFollowingHost(false);
            } else {
                await userService.followUser(hostId);
                setIsFollowingHost(true);
            }
        } catch (err) {
            setError(prev => `${prev || ''} Follow action failed.`);
        } finally {
            setFollowLoading(false);
        }
    }, [currentUser, streamDataFromAPI, isFollowingHost, followLoading]);


    // --- NEW: Handle End Stream Process ---
    const handleEndStreamProcess = useCallback(async () => {
        if (!streamId || !isCurrentUserStreamerRef.current || isEndingStream) return;
        if (!window.confirm("Are you sure you want to end this stream? This action cannot be undone.")) return;

        setIsEndingStream(true);
        setError(null);
        try {
            await streamService.endLiveStream(streamId); // API call to backend
            if (roomRef.current) {
                await roomRef.current.disconnect(true); // Disconnect from LiveKit
            }
            setStatusMessage("Stream ended.");
            // No alert needed here, navigate will provide feedback
            navigate('/dashboard/streams'); // Navigate after successful end
        } catch (err) {
            console.error("Error ending stream:", err);
            setError(err.message || "Could not end stream. Please try again from your dashboard.");
            // Do not navigate if ending failed, allow retry or manual check
        } finally {
            setIsEndingStream(false);
        }
    }, [streamId, navigate, isEndingStream]);


    useEffect(() => {
        // ... (existing init useEffect for fetching streamData, tokens, chat history, etc.)
        if (!streamId) {
            setError("Stream ID is missing.");
            setIsLoadingStreamData(false);
            return;
        }
        let isMounted = true;
        useEmotionStore.getState().init(EMOTIONS_LIST);
        setAnalyzedMessageIds(new Set());
        const init = async () => {
            setIsLoadingStreamData(true);
            try {
                const apiStreamDataResponse = await streamService.getStreamDetails(streamId);
                if (!isMounted) return;
                setStreamDataFromAPI(apiStreamDataResponse);
                if (apiStreamDataResponse && apiStreamDataResponse.User && apiStreamDataResponse.User.user_id) {
                    try {
                        const streamerProds = await productService.getProductsByUserId(apiStreamDataResponse.User.user_id);
                        if (isMounted) {
                            setStreamerOwnedProducts(streamerProds || []);
                        }
                    } catch (productsError) {
                        console.error("Failed to fetch streamer's products:", productsError);
                        if (isMounted) setStreamerOwnedProducts([]);
                    }
                } else {
                     if (isMounted) setStreamerOwnedProducts([]);
                }
                const streamAuctions = await auctionService.getAllAuctions({ streamId: streamId, status: 'active' }).catch(() => []);
                if (isMounted && streamAuctions.length > 0) setCurrentAuction(streamAuctions[0]);
                const userIsStreamerCheck = currentUser?.user_id === apiStreamDataResponse?.user_id;
                setIsCurrentUserStreamer(userIsStreamerCheck);
                let tokenResponse = userIsStreamerCheck
                    ? await streamService.goLiveStreamer(streamId)
                    : await streamService.joinLiveStreamViewer(streamId);
                if (!isMounted) return;
                setLiveKitToken(tokenResponse.token);
                setLiveKitUrl(tokenResponse.livekitUrl);
                if (isMounted && currentUser && !userIsStreamerCheck && apiStreamDataResponse?.User?.user_id) {
                    const followStatus = await userService.getFollowingStatus(apiStreamDataResponse.User.user_id).catch(() => ({isFollowing: false}));
                    if (isMounted) setIsFollowingHost(followStatus.isFollowing);
                }
                const history = await chatService.getChatMessages(streamId);
                if(isMounted) {
                    const formattedHistory = history.map(msg => ({
                        id: `db-${msg.message_id}`,
                        user: {
                            username: msg.User?.username || msg.username_at_send_time,
                            avatar: msg.User?.profile_picture_url || msg.avatar_url_at_send_time,
                            isMod: false, identity: `user-${msg.user_id}`,
                        },
                        text: msg.message_text, timestamp: msg.sent_at,
                    }));
                    setChatMessages(formattedHistory);
                }
            } catch (err) {
                if (isMounted) setError(err?.response?.data?.message || err?.message || "An error occurred loading stream data.");
            } finally {
                if (isMounted) setIsLoadingStreamData(false);
            }
        };
        init();
        return () => { 
            isMounted = false;
            useEmotionStore.getState().reset();
        };
    }, [streamId, currentUser?.user_id, isAuthenticated]); // Added isAuthenticated to re-evaluate if auth state changes


    useEffect(() => {
        // ... (existing LiveKit room connection useEffect)
        if (!liveKitUrl || !liveKitToken || isLoadingStreamData) return;
        if (roomRef.current && roomRef.current.state !== ConnectionState.Disconnected) { // Check if already connected or connecting
            return;
        }
        
        // Clear previous room instance before creating a new one
        if (roomRef.current) {
            roomRef.current.disconnect(true).catch(e => console.warn("Cleanup: Error disconnecting old room", e));
            roomRef.current.removeAllListeners();
        }
    
        const room = new Room({ logLevel: LogLevel.info, adaptiveStream: true, dynacast: true });
        roomRef.current = room;
    
        room.on(RoomEvent.ConnectionStateChanged, (state) => handleConnectionStateChange(state, room));
        room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
        room.on(RoomEvent.ParticipantConnected, handleParticipantConnectedEvent);
        room.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnectedEvent);
        room.on(RoomEvent.DataReceived, handleDataReceived);
        room.on(RoomEvent.AudioPlaybackStatusChanged, () => handleAudioPlaybackChange(room));
    
        room.connect(liveKitUrl, liveKitToken)
            .then(() => console.log("Successfully connected to LiveKit room:", room.name))
            .catch(err => {
                setError(prev => `${prev || ''} LiveKit Connection Failed: ${err.message}`);
                console.error("LiveKit Connection Error in useEffect:", err);
        });
    
        return () => {
            if (roomRef.current) {
                roomRef.current.disconnect(true)
                    .then(() => console.log("LiveKit room disconnected on cleanup."))
                    .catch(e => console.warn("Error disconnecting room on cleanup:", e));
                roomRef.current.removeAllListeners();
                roomRef.current = null; // Ensure ref is cleared
            }
        };
    }, [liveKitUrl, liveKitToken, isLoadingStreamData, handleConnectionStateChange, handleTrackSubscribed, handleParticipantConnectedEvent, handleParticipantDisconnectedEvent, handleDataReceived, handleAudioPlaybackChange]);


    // --- NEW: beforeunload listener ---
    useEffect(() => {
        const handleBeforeUnload = (event) => {
            if (isCurrentUserStreamerRef.current && roomRef.current && roomRef.current.state === ConnectionState.Connected) {
                const confirmationMessage = "If you close this tab, the stream will end. Are you sure?";
                event.preventDefault(); // Standard for most browsers
                event.returnValue = confirmationMessage; // For older browsers
                return confirmationMessage; // For some other browsers
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, []); // Runs once on mount, relies on isCurrentUserStreamerRef for current state

    // Emotion analysis effect (no changes needed here)
    useEffect(() => {
        // ... (existing emotion analysis logic)
         const newMessages = chatMessages.filter(msg => msg.id && msg.text && !analyzedMessageIds.has(msg.id) && !msg.emotions);
        if (newMessages.length === 0) return;

        const newIds = new Set(newMessages.map(m => m.id));
        setAnalyzedMessageIds(prev => new Set([...Array.from(prev), ...Array.from(newIds)]));

        const analyze = async () => {
            for (const message of newMessages) {
                try {
                    const result = await emotionService.analyzeEmotion(message.text);
                    const threshold = 0.18;
                    let detectedMessageEmotions = [];

                    if (result && result.scores && typeof result.scores === 'object') {
                        const emotionsWithScores = Object.entries(result.scores)
                            .filter(([, score]) => score > threshold)
                            .sort(([, scoreA], [, scoreB]) => scoreB - scoreA);
                        detectedMessageEmotions = emotionsWithScores.map(([name]) => name);
                        detectedMessageEmotions.forEach(emotionName => {
                            if (EMOTIONS_LIST.includes(emotionName)) {
                                useEmotionStore.getState().increment(emotionName);
                            }
                        });
                    }
                    setChatMessages(prevChatMessages =>
                        prevChatMessages.map(m =>
                            m.id === message.id
                                ? { ...m, emotions: detectedMessageEmotions.slice(0, 3) }
                                : m
                        )
                    );
                } catch (error) {
                    console.error(`Failed to analyze message ID ${message.id}:`, error);
                    setChatMessages(prevChatMessages =>
                        prevChatMessages.map(m =>
                            m.id === message.id
                                ? { ...m, emotions: [] }
                                : m
                        )
                    );
                }
            }
        };
        analyze();
    }, [chatMessages, analyzedMessageIds]);

    // Loading and Error states (no changes needed here)
    if (isLoadingStreamData && !streamDataFromAPI) { // Show full page loader only if streamData is not yet loaded
        return (
            <div className="flex h-screen items-center justify-center bg-black">
                <span className="loading loading-lg loading-dots text-white"></span>
                <p className="ml-4 text-white">Loading Stream...</p>
            </div>
        );
    }
    if (error && !streamDataFromAPI) { // Show full page error if streamData couldn't load
        return (
            <div className="flex flex-col h-screen items-center justify-center bg-neutral-900 text-white p-4 text-center">
                <FiAlertTriangle className="w-16 h-16 text-error mb-4"/>
                <h2 className="text-2xl font-semibold text-error mb-4">Stream Unavailable</h2>
                <p className="mb-6 max-w-md text-red-400/80">{error}</p>
                <button onClick={() => navigate('/')} className="btn btn-primary">Go Home</button>
            </div>
        );
    }
     if (!streamDataFromAPI && !isLoadingStreamData && !error) { // Loaded, no error, but no data (e.g. stream deleted)
        return (
            <div className="flex flex-col h-screen items-center justify-center bg-neutral-900 text-white p-4 text-center">
                <FiAlertTriangle className="w-16 h-16 text-warning mb-4"/>
                <h2 className="text-2xl font-semibold text-warning mb-4">Stream Not Found</h2>
                <p className="mb-6 max-w-md">This stream may have ended or does not exist.</p>
                <button onClick={() => navigate('/')} className="btn btn-primary">Go Home</button>
            </div>
        );
    }


    const participantForVideoPlayer = isCurrentUserStreamer ? localParticipantState : mainParticipant;

    // Prepare props for StreamHeader, which is now inside StreamVideoPlayer
    const streamHeaderDataForPlayer = {
        id: streamDataFromAPI?.stream_id || null,
        title: streamDataFromAPI?.title || 'Loading Stream...',
        host: streamDataFromAPI?.User ? {
            user_id: streamDataFromAPI.User.user_id,
            username: streamDataFromAPI.User.username || 'Streamer',
            avatarUrl: streamDataFromAPI.User.profile_picture_url,
            rating: streamDataFromAPI.User.seller_rating || 0,
            isFollowed: isFollowingHost,
        } : { username: 'Streamer', rating: 0, isFollowed: false }, // Provide defaults for host
        viewerCount: roomParticipants.length || 0, // Use roomParticipants.length as a direct source or default to 0
        streamUrl: typeof window !== 'undefined' ? window.location.href : '', // Check for window
    };

    return (
        <div className="flex flex-col h-screen bg-neutral-900 text-white overflow-hidden">
            {/* StreamVideoPlayer now receives streamHeaderDataForPlayer */}
            <div className="flex flex-1 overflow-hidden">
                {/* Left Sidebar */}
                <aside className="hidden md:flex flex-col w-72 lg:w-80 xl:w-96 bg-black border-r border-neutral-800 overflow-y-auto">
                    <StreamProductList
                        streamTitle={streamDataFromAPI?.title || "Available Products"}
                        products={streamerOwnedProducts}
                    />
                    {isCurrentUserStreamer && (
                        <StreamerAuctionPanel
                            currentStreamId={streamId}
                            onAuctionAction={handleAuctionAction}
                            currentAuction={currentAuction}
                        />
                    )}
                </aside>

                {/* Center Video Player Area */}
                <div className="flex-1 flex items-center justify-center bg-black overflow-hidden relative">
                    <StreamVideoPlayer
                        mainParticipant={participantForVideoPlayer}
                        isLocalStreamer={isCurrentUserStreamer && participantForVideoPlayer === localParticipantState}
                        isAudioMuted={isCurrentUserStreamer ? isLocalAudioMuted : isRemoteAudioMuted}
                        onToggleAudioMute={isCurrentUserStreamer ? handleToggleLocalAudioMute : handleToggleRemoteAudioMute}
                        thumbnailUrl={streamDataFromAPI?.thumbnail_url}
                        currentAuctionOnVideo={currentAuction}
                        streamHeaderData={streamHeaderDataForPlayer} // Pass the resilient object
                        onFollowToggleHeader={handleFollowToggle}
                        onEndStream={handleEndStreamProcess}
                    />
                    {/* Mobile Overlays: Chat, Auction Controls, Input */}
                    <div className="absolute inset-0 flex flex-col justify-end pointer-events-none md:hidden">
                        {/* Mobile Header (simplified) */}
                        {streamDataFromAPI && ( // Check if streamDataFromAPI exists
                            <div className="absolute top-0 left-0 right-0 p-2 bg-gradient-to-b from-black/70 to-transparent z-30 pointer-events-auto">
                                <div className="flex items-center gap-2">
                                    <Link to="/" className="btn btn-ghost btn-xs btn-circle text-white">
                                        <FiArrowLeft size={18}/>
                                    </Link>
                                    <div className="avatar">
                                        <div className="w-7 h-7 rounded-full bg-neutral-700">
                                            {streamDataFromAPI.User?.profile_picture_url ? <img src={streamDataFromAPI.User.profile_picture_url} alt={streamDataFromAPI.User.username} /> : streamDataFromAPI.User?.username?.charAt(0).toUpperCase()}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold line-clamp-1">{streamDataFromAPI.User?.username}</p>
                                        {/* Use streamHeaderDataForPlayer.viewerCount here for consistency */}
                                        <p className="text-[10px] text-neutral-400">{streamHeaderDataForPlayer.viewerCount} watching</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex-grow flex flex-col-reverse overflow-hidden">
                            <StreamChat
                                variant="overlay"
                                messages={chatMessages}
                                localParticipantIdentity={roomRef.current?.localParticipant?.identity}
                            />
                        </div>
                        {currentAuction && currentAuction.Product && (
                             <div className="pointer-events-auto">
                                <StreamAuctionControls
                                    auctionData={currentAuction}
                                    onPlaceBid={handlePlaceBid}
                                    currentUserId={currentUser?.user_id}
                                    isStreamer={isCurrentUserStreamer}
                                    isLoadingBid={isAuctionLoading}
                                />
                             </div>
                        )}
                        <div className="pointer-events-auto">
                            <StreamChat
                                variant="input_only"
                                onSendMessage={sendChatMessageViaLiveKit}
                            />
                        </div>
                         {auctionError && <div className="alert alert-error p-2 text-xs justify-start mx-2 my-1 shadow-lg pointer-events-auto"><FiAlertTriangle className="mr-1"/><span>{auctionError}</span></div>}
                    </div>
                </div>

                {/* Right Sidebar (Chat & Desktop Auction Controls) */}
                <aside className="hidden md:flex flex-col w-80 lg:w-96 bg-black border-l border-neutral-800 overflow-hidden">
                    {currentAuction && currentAuction.Product ? (
                        <div className="shrink-0">
                            <StreamAuctionControls
                                auctionData={currentAuction}
                                onPlaceBid={handlePlaceBid}
                                currentUserId={currentUser?.user_id}
                                isStreamer={isCurrentUserStreamer}
                                isLoadingBid={isAuctionLoading}
                            />
                        </div>
                    ) : (
                         <div className="bg-neutral-900 p-3 sm:p-4 border-t border-neutral-800 text-neutral-500 text-sm text-center shrink-0">
                            No active auction.
                         </div>
                    )}
                    {auctionError && <div className="alert alert-error p-2 text-xs justify-start mx-2 my-1 shadow-lg"><FiAlertTriangle className="mr-1"/><span>{auctionError}</span></div>}
                    <div className="flex-grow overflow-y-auto">
                        <StreamChat
                            variant="full"
                            messages={chatMessages} activeTab={activeTab} onTabChange={setActiveTab}
                            viewerCount={streamHeaderDataForPlayer.viewerCount} // Now this should be safe
                            onSendMessage={sendChatMessageViaLiveKit}
                            localParticipantIdentity={roomRef.current?.localParticipant?.identity}
                            roomParticipantsForChat={roomParticipants}
                        />
                    </div>
                </aside>
            </div>

            {/* ... (rest of the component: audio playback prompt, ending stream loading) */}
            {!canPlaybackAudio && roomRef.current?.state === ConnectionState.Connected && (
                <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-yellow-500 text-black px-4 py-2 rounded-md text-sm z-50 shadow-lg animate-pulse">
                    Tap/Click page to enable audio
                </div>
            )}
            {isEndingStream && (
                <div className="fixed inset-0 bg-black/70 flex flex-col items-center justify-center z-[100]">
                    <span className="loading loading-lg loading-dots text-white"></span>
                    <p className="text-white mt-3">Ending stream...</p>
                </div>
            )}
        </div>
    );
}

export default StreamPage;