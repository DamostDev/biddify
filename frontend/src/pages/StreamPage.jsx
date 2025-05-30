// src/pages/StreamPage.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Room, RoomEvent, ConnectionState, Track, DataPacket_Kind,
    LogLevel,
} from 'livekit-client';
import useAuthStore from '../services/authStore.js';
import streamService from '../services/streamService.js';

import StreamVideoPlayer from '../components/stream/StreamVideoPlayer';
import StreamChat from '../components/stream/StreamChat';
import StreamProductList from '../components/stream/StreamProductList';
import StreamAuctionControls from '../components/stream/StreamAuctionControls';
import StreamHeader from '../components/stream/StreamHeader';
import { FiMessageSquare } from 'react-icons/fi';

function StreamPage() {
    const { streamId } = useParams();
    const navigate = useNavigate();
    const { user: currentUser, isAuthenticated } = useAuthStore();

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
    const [activeTab, setActiveTab] = useState('chat'); // For chat/product sidebar on mobile

    const roomRef = useRef(null);
    const isCurrentUserStreamerRef = useRef(isCurrentUserStreamer);
    useEffect(() => {
        isCurrentUserStreamerRef.current = isCurrentUserStreamer;
    }, [isCurrentUserStreamer]);

    const safeParseMetadata = useCallback((metadataString) => {
        if (!metadataString) return {};
        try { return JSON.parse(metadataString); }
        catch (e) { console.warn("Failed to parse metadata:", metadataString, e); return {}; }
    }, []);

    useEffect(() => {
        if (!streamId) { setError("Stream ID is missing."); setIsLoadingStreamData(false); return; }
        let isMounted = true;
        setIsLoadingStreamData(true); setStatusMessage("Fetching stream details..."); setError(null);
        setLiveKitToken(null); setLiveKitUrl(null);
        setStreamDataFromAPI(null);

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
        if (!participant || !roomRef.current || isCurrentUserStreamerRef.current) return;
        const meta = safeParseMetadata(participant.metadata);
        if (meta.role === 'streamer' || participant.identity.includes('-streamer-')) {
            setMainParticipant(prev => (!prev || prev.sid !== participant.sid ? participant : prev));
        }
    }, [safeParseMetadata]);

    const handleConnectionStateChange = useCallback(async (connectionState) => {
        if (!roomRef.current) return;
        const currentRoom = roomRef.current;
        setStatusMessage(`LiveKit: ${connectionState}`);
        setCanPlaybackAudio(currentRoom.canPlaybackAudio);

        if (connectionState === ConnectionState.Connected) {
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
            setLocalParticipantState(null); setMainParticipant(null);
        } else if (connectionState === ConnectionState.Failed) {
            setError(prev => `${prev || ''} LiveKit connection failed.`);
        }
    }, [handleNewStreamerCandidate, isLocalAudioMuted]);

    const handleTrackSubscribed = useCallback((track, publication, remoteParticipant) => {
        if (!isCurrentUserStreamerRef.current) {
             handleNewStreamerCandidate(remoteParticipant);
        }
    }, [handleNewStreamerCandidate]);

    const handleParticipantConnectedEvent = useCallback((participant) => {
        if (!isCurrentUserStreamerRef.current) {
            handleNewStreamerCandidate(participant);
        }
    }, [handleNewStreamerCandidate]);

    const handleParticipantDisconnectedEvent = useCallback((participant) => {
        setMainParticipant(prevStreamer => (prevStreamer?.sid === participant.sid ? null : prevStreamer));
    }, []);

    const handleDataReceived = useCallback((payload, participant) => {
        try {
            const messageData = JSON.parse(new TextDecoder().decode(payload));
            if (messageData.type === 'chat') {
                setChatMessages(prev => [...prev, {
                    id: `lk-${Date.now()}-${Math.random()}`,
                    user: {
                        username: messageData.username || participant?.identity.split('-')[1] || 'User',
                        avatar: messageData.avatar,
                        isMod: participant?.metadata ? safeParseMetadata(participant.metadata).isMod : false,
                    },
                    text: messageData.text,
                    timestamp: new Date(messageData.timestamp || Date.now()),
                }]);
            }
        } catch (e) { console.error('Error processing data message:', e); }
    }, [safeParseMetadata]);

    const handleAudioPlaybackChange = useCallback(() => {
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
        if (!liveKitUrl || !liveKitToken || isLoadingStreamData) return;
        if (roomRef.current) {
            roomRef.current.disconnect(true);
            roomRef.current = null;
        }
        setStatusMessage("Connecting to LiveKit...");
        const room = new Room({ logLevel: LogLevel.debug, adaptiveStream: true, dynacast: true });
        roomRef.current = room;

        room.on(RoomEvent.ConnectionStateChanged, handleConnectionStateChange);
        room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
        room.on(RoomEvent.ParticipantConnected, handleParticipantConnectedEvent);
        room.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnectedEvent);
        room.on(RoomEvent.DataReceived, handleDataReceived);
        room.on(RoomEvent.AudioPlaybackStatusChanged, handleAudioPlaybackChange);

        room.connect(liveKitUrl, liveKitToken)
            .catch(err => {
                setError(prev => `${prev || ''} LiveKit Connection Init Failed: ${err.message}`);
                setStatusMessage("Error: Connection Init Failed");
                if (roomRef.current === room) {
                    room.removeAllListeners(); room.disconnect(true); roomRef.current = null;
                }
            });
        return () => {
            if (roomRef.current === room) roomRef.current = null;
            room.removeAllListeners(); room.disconnect(true);
        };
    }, [
        liveKitUrl, liveKitToken, isLoadingStreamData,
        handleConnectionStateChange, handleTrackSubscribed, handleParticipantConnectedEvent,
        handleParticipantDisconnectedEvent, handleDataReceived, handleAudioPlaybackChange
    ]);

    const handleToggleLocalAudioMute = useCallback(async () => {
        if (!roomRef.current?.localParticipant || !isCurrentUserStreamerRef.current) return;
        const newMutedState = !isLocalAudioMuted;
        try {
            await roomRef.current.localParticipant.setMicrophoneEnabled(!newMutedState);
            setIsLocalAudioMuted(newMutedState);
        } catch (err) { console.error("Error toggling microphone:", err); }
    }, [isLocalAudioMuted]);

    const handleToggleRemoteAudioMute = useCallback(() => {
        if (!isCurrentUserStreamerRef.current) setIsRemoteAudioMuted(prev => !prev);
    }, []);

    const sendChatMessage = useCallback((text) => {
        if (!roomRef.current?.localParticipant || !text.trim()) return;
        const messageData = {
            type: 'chat', text: text.trim(),
            username: currentUser?.username || `User-${roomRef.current.localParticipant.identity.slice(0,4)}`,
            timestamp: new Date().toISOString(),
        };
        roomRef.current.localParticipant.publishData(new TextEncoder().encode(JSON.stringify(messageData)), DataPacket_Kind.RELIABLE)
            .catch(e => console.error("Failed to send chat message:", e));
    }, [currentUser]);

    const handleRetryConnection = useCallback(() => {
        setError(null); setStatusMessage("Retrying...");
        setIsLoadingStreamData(true); setLiveKitToken(null); setLiveKitUrl(null);
        if (roomRef.current) { roomRef.current.disconnect(true); roomRef.current = null; }
    }, []);

    if (isLoadingStreamData && !liveKitToken) {
        return (
            <div className="flex h-screen items-center justify-center bg-black">
                <span className="loading loading-lg loading-dots text-white"></span>
                <p className="ml-4 text-white">Loading Stream...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col h-screen items-center justify-center bg-neutral-900 text-white p-4 text-center">
                <h2 className="text-2xl font-semibold text-red-500 mb-4">Stream Error</h2>
                <p className="mb-6 max-w-md">{error}</p>
                <div className="space-x-4">
                    <button onClick={handleRetryConnection} className="btn btn-warning">Try Again</button>
                    <button onClick={() => navigate('/')} className="btn btn-primary">Home</button>
                </div>
            </div>
        );
    }

    const participantForVideoPlayer = isCurrentUserStreamer ? localParticipantState : mainParticipant;
    const streamHeaderProps = {
        id: streamDataFromAPI?.stream_id,
        title: streamDataFromAPI?.title,
        host: streamDataFromAPI?.User || { username: 'Streamer', avatarUrl: '', rating: 0, isFollowed: false },
        viewerCount: roomRef.current?.remoteParticipants.size + (roomRef.current?.localParticipant ? 1: 0) || 0,
        streamUrl: window.location.href,
    };
    const currentAuctionProductData = streamDataFromAPI?.auctions?.[0]?.Product ? {
        name: streamDataFromAPI.auctions[0].Product.title,
        imageUrl: streamDataFromAPI.auctions[0].Product.images?.[0]?.image_url || 'https://via.placeholder.com/80',
        condition: streamDataFromAPI.auctions[0].Product.condition,
        shippingInfo: "Ships in 2-3 days",
        bids: streamDataFromAPI.auctions[0].Bids?.length || 0,
        currentBid: streamDataFromAPI.auctions[0].current_price || streamDataFromAPI.auctions[0].starting_price || 50,
        timeLeft: "2:30",
    } : null;

    return (
        <div className="flex flex-col h-screen bg-neutral-900 text-white overflow-hidden"
             onClick={() => {
                if (roomRef.current && !roomRef.current.canPlaybackAudio) {
                    roomRef.current.startAudio().catch(e => console.warn("Error starting audio on click", e));
                }
             }}
        >
            <StreamHeader streamData={streamHeaderProps} />

            <div className="flex flex-1 overflow-hidden">
                <aside className="hidden md:flex flex-col w-72 lg:w-80 xl:w-96 bg-black border-r border-neutral-800 overflow-y-auto">
                    <StreamProductList
                        streamTitle={streamDataFromAPI?.title || "Products"}
                        products={streamDataFromAPI?.Products || []}
                    />
                </aside>

                <div className="flex-1 flex items-center justify-center bg-black overflow-hidden px-0 md:px-4 py-0 md:py-4"> {/* Added py for vertical centering if needed */}
                    <StreamVideoPlayer
                        mainParticipant={participantForVideoPlayer}
                        isLocalStreamer={isCurrentUserStreamer && participantForVideoPlayer === localParticipantState}
                        isAudioMuted={isCurrentUserStreamer ? isLocalAudioMuted : isRemoteAudioMuted}
                        onToggleAudioMute={isCurrentUserStreamer ? handleToggleLocalAudioMute : handleToggleRemoteAudioMute}
                        thumbnailUrl={streamDataFromAPI?.thumbnail_url || "https://via.placeholder.com/900x1600.png?text=Stream+Offline"}
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