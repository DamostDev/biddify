// frontend/src/pages/StreamPage.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Room, RoomEvent, ConnectionState, Track, DataPacket_Kind,
    LogLevel,
} from 'livekit-client';
import { FiMessageSquare, FiAlertTriangle } from 'react-icons/fi';

import useAuthStore from '../services/authStore.js';
import streamService from '../services/streamService.js';
import auctionService from '../services/auctionService.js';
import * as userService from '../services/userService.js';
import chatService from '../services/chatService.js';
import useEmotionStore from '../services/emotionStore.js';
import emotionService from '../services/emotionService.js';

import StreamVideoPlayer from '../components/stream/StreamVideoPlayer';
import StreamChat from '../components/stream/StreamChat';
import StreamProductList from '../components/stream/StreamProductList';
import StreamAuctionControls from '../components/stream/StreamAuctionControls';
import StreamHeader from '../components/stream/StreamHeader';
import StreamerAuctionPanel from '../components/stream/StreamerAuctionPanel';

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

    // Core State
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

    // UI and Feature State
    const [chatMessages, setChatMessages] = useState([]);
    const [isLocalAudioMuted, setIsLocalAudioMuted] = useState(false);
    const [isRemoteAudioMuted, setIsRemoteAudioMuted] = useState(false);
    const [activeTab, setActiveTab] = useState('chat');
    const [isFollowingHost, setIsFollowingHost] = useState(false);
    const [roomParticipants, setRoomParticipants] = useState([]);
    const [analyzedMessageIds, setAnalyzedMessageIds] = useState(new Set());

    // Auction State
    const [currentAuction, setCurrentAuction] = useState(null);
    const [isAuctionLoading, setIsAuctionLoading] = useState(false);
    const [auctionError, setAuctionError] = useState(null);
    const [followLoading, setFollowLoading] = useState(false);

    // Refs
    const roomRef = useRef(null);
    const isCurrentUserStreamerRef = useRef(isCurrentUserStreamer);

    useEffect(() => {
        isCurrentUserStreamerRef.current = isCurrentUserStreamer;
    }, [isCurrentUserStreamer]);

    // All hooks and callbacks (handleDataReceived, init, emotion analysis, etc.) remain the same.
    // Copy the full logic from your previous, working file for this section.
    // For brevity, I'll include just the function definitions. The implementation is unchanged.
    const updateRoomParticipantsList = useCallback((roomInstance) => { /* ... */ });
    const handleNewStreamerCandidate = useCallback((participant) => { /* ... */ });
    const handleConnectionStateChange = useCallback(async (connectionState, roomInstance) => { /* ... */ });
    const handleTrackSubscribed = useCallback((track, publication, remoteParticipant) => { /* ... */ });
    const handleParticipantConnectedEvent = useCallback((participant) => { /* ... */ });
    const handleParticipantDisconnectedEvent = useCallback((participant) => { /* ... */ });
    const handleDataReceived = useCallback((payload, participant) => { /* ... */ });
    const handleAudioPlaybackChange = useCallback((roomInstance) => { /* ... */ });
    const sendLiveKitData = useCallback(async (type, payload) => { /* ... */ });
    const handleAuctionAction = useCallback((action) => { /* ... */ });
    const handleToggleLocalAudioMute = useCallback(async () => { /* ... */ });
    const handleToggleRemoteAudioMute = useCallback(() => { /* ... */ });
    const sendChatMessageViaLiveKit = useCallback(async (text) => { /* ... */ });
    const handlePlaceBid = useCallback(async (auctionId, amount) => { /* ... */ });
    const handleFollowToggle = useCallback(async () => { /* ... */ });

    useEffect(() => { /* init effect */ }, [streamId, currentUser?.user_id, isAuthenticated]);
    useEffect(() => { /* LiveKit connection effect */ }, [liveKitUrl, liveKitToken, isLoadingStreamData]);
    useEffect(() => { /* emotion analysis effect */ }, [chatMessages, analyzedMessageIds]);

    if (isLoadingStreamData) {
        return (
            <div className="flex h-screen items-center justify-center bg-black">
                <span className="loading loading-lg loading-dots text-white"></span>
            </div>
        );
    }
    if (error) {
        return (
            <div className="flex flex-col h-screen items-center justify-center bg-neutral-900 text-white p-4 text-center">
                <FiAlertTriangle className="w-16 h-16 text-error mb-4"/>
                <h2 className="text-2xl font-semibold text-error mb-4">Stream Unavailable</h2>
                <p className="mb-6 max-w-md text-red-400/80">{error}</p>
                <button onClick={() => navigate('/')} className="btn btn-primary">Go Home</button>
            </div>
        );
    }
    if (!streamDataFromAPI) {
         return (
            <div className="flex flex-col h-screen items-center justify-center bg-neutral-900 text-white p-4 text-center">
                <FiAlertTriangle className="w-16 h-16 text-warning mb-4"/>
                <h2 className="text-2xl font-semibold text-warning mb-4">Stream Data Not Found</h2>
                <button onClick={() => navigate('/')} className="btn btn-primary">Go Home</button>
            </div>
        );
    }

    const participantForVideoPlayer = isCurrentUserStreamer ? localParticipantState : mainParticipant;
    const streamHeaderProps = {
        id: streamDataFromAPI?.stream_id,
        title: streamDataFromAPI?.title,
        host: streamDataFromAPI?.User ? {
            user_id: streamDataFromAPI.User.user_id,
            username: streamDataFromAPI.User.username,
            avatarUrl: streamDataFromAPI.User.profile_picture_url,
            rating: streamDataFromAPI.User.seller_rating || 0,
            isFollowed: isFollowingHost,
        } : {},
        viewerCount: roomParticipants.length,
        streamUrl: window.location.href,
    };
    const productsForProductList = streamDataFromAPI?.Products || [];

    return (
        <div className="flex flex-col h-screen bg-neutral-900 text-white overflow-hidden">
            <StreamHeader
                streamData={streamHeaderProps}
                onFollowToggle={handleFollowToggle}
                isCurrentUserHost={currentUser?.user_id === streamDataFromAPI?.User?.user_id}
            />
            <div className="flex flex-1 overflow-hidden">
                <aside className="hidden md:flex flex-col w-72 lg:w-80 xl:w-96 bg-black border-r border-neutral-800 overflow-y-auto">
                    <StreamProductList
                        streamTitle={streamDataFromAPI?.title || "Available Products"}
                        products={productsForProductList}
                    />
                    {isCurrentUserStreamer && (
                        <StreamerAuctionPanel
                            currentStreamId={streamId}
                            onAuctionAction={handleAuctionAction}
                            currentAuction={currentAuction}
                        />
                    )}
                </aside>

                <div className="flex-1 flex items-center justify-center bg-black overflow-hidden relative">
                    <StreamVideoPlayer
                        mainParticipant={participantForVideoPlayer}
                        isLocalStreamer={isCurrentUserStreamer && participantForVideoPlayer === localParticipantState}
                        isAudioMuted={isCurrentUserStreamer ? isLocalAudioMuted : isRemoteAudioMuted}
                        onToggleAudioMute={isCurrentUserStreamer ? handleToggleLocalAudioMute : handleToggleRemoteAudioMute}
                        thumbnailUrl={streamDataFromAPI?.thumbnail_url}
                        currentAuctionOnVideo={currentAuction}
                    />

                    <div className="absolute inset-0 flex flex-col justify-end pointer-events-none md:hidden">
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
                            viewerCount={streamHeaderProps.viewerCount} onSendMessage={sendChatMessageViaLiveKit}
                            localParticipantIdentity={roomRef.current?.localParticipant?.identity}
                            roomParticipantsForChat={roomParticipants}
                        />
                    </div>
                </aside>
            </div>
            
            {!canPlaybackAudio && roomRef.current?.state === ConnectionState.Connected && (
                <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-yellow-500 text-black px-4 py-2 rounded-md text-sm z-50 shadow-lg animate-pulse">
                    Tap/Click page to enable audio
                </div>
            )}
        </div>
    );
}

export default StreamPage;