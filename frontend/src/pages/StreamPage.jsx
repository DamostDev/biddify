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
import * as userService from '../services/userService.js'; // Corrected import for follow actions // Added for follow actions
import chatService from '../services/chatService.js';

import StreamVideoPlayer from '../components/stream/StreamVideoPlayer';
import StreamChat from '../components/stream/StreamChat';
import StreamProductList from '../components/stream/StreamProductList';
import StreamAuctionControls from '../components/stream/StreamAuctionControls';
import StreamHeader from '../components/stream/StreamHeader';
import StreamerAuctionPanel from '../components/stream/StreamerAuctionPanel';

const safeParseMetadata = (metadataString) => {
    if (!metadataString) return {};
    try { return JSON.parse(metadataString); }
    catch (e) { console.warn("Failed to parse metadata:", metadataString, e); return {}; }
};

function StreamPage() {
    const { streamId } = useParams();
    const navigate = useNavigate();
    const { user: currentUser, isAuthenticated } = useAuthStore();

    // Core Stream and LiveKit State
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
    const [isFollowingHost, setIsFollowingHost] = useState(false); // For follow button
    const [roomParticipants, setRoomParticipants] = useState([]); // For "Watching" tab

    // Auction Specific State
    const [currentAuction, setCurrentAuction] = useState(null);
    const [isAuctionLoading, setIsAuctionLoading] = useState(false);
    const [auctionError, setAuctionError] = useState(null);
    const [followLoading, setFollowLoading] = useState(false); // To disable follow button during API call

    // Refs
    const roomRef = useRef(null);
    const isCurrentUserStreamerRef = useRef(isCurrentUserStreamer);

    useEffect(() => {
        isCurrentUserStreamerRef.current = isCurrentUserStreamer;
    }, [isCurrentUserStreamer]);


    // ========================================================================
    //  LIVEKIT EVENT HANDLERS - DEFINED BEFORE USAGE IN EFFECTS
    // ========================================================================

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
            name: p.name, // Name set during token generation
            metadata: safeParseMetadata(p.metadata) // For potential role-based styling
        })));
    }, [safeParseMetadata]);
    const handleNewStreamerCandidate = useCallback((participant) => {
        if (!participant || !roomRef.current || isCurrentUserStreamerRef.current) return;
        const meta = safeParseMetadata(participant.metadata);
        if (meta.role === 'streamer' || participant.identity.includes('-streamer-')) {
            console.log("[StreamPage LK CB] New streamer candidate identified:", participant.identity);
            setMainParticipant(prev => (!prev || prev.sid !== participant.sid ? participant : prev));
        }
    }, [safeParseMetadata]);

    const handleConnectionStateChange = useCallback(async (connectionState, roomInstance) => {
        if (!roomInstance) {
            console.warn("[LK CB] handleConnectionStateChange called but roomInstance is undefined.");
            return;
        }
        console.log(`[LK CB] Connection State Changed: ${connectionState} for Room SID: ${roomInstance.sid}`);
        setStatusMessage(`LiveKit: ${connectionState}`);
        setCanPlaybackAudio(roomInstance.canPlaybackAudio);

        if (connectionState === ConnectionState.Connected) {
            console.log(`[LK CB] ==> CONNECTED to room: ${roomInstance.name}, Local SID: ${roomInstance.localParticipant.sid}`);
            setLocalParticipantState(roomInstance.localParticipant);
            roomInstance.remoteParticipants.forEach(p => handleNewStreamerCandidate(p)); // Process existing remotes
            updateRoomParticipantsList(roomInstance);

            if (isCurrentUserStreamerRef.current && roomInstance.localParticipant) {
                console.log("[LK CB] User is streamer. Setting self as main participant and enabling media.");
                setMainParticipant(roomInstance.localParticipant);
                try {
                    await roomInstance.localParticipant.setCameraEnabled(true);
                    await roomInstance.localParticipant.setMicrophoneEnabled(!isLocalAudioMuted);
                    console.log("[LK CB] Streamer media enabled.");
                } catch (mediaError) {
                    console.error("[LK CB] Error enabling streamer media:", mediaError);
                    setError(prev => `${prev || ''} Media Error: ${mediaError.message}. Check permissions.`);
                }
            }
        } else if (connectionState === ConnectionState.Disconnected) {
            console.log(`[LK CB] DISCONNECTED from room SID: ${roomInstance.sid}`);
            setLocalParticipantState(null); setMainParticipant(null);
            setRoomParticipants([]); // Clear participants on disconnect
        } else if (connectionState === ConnectionState.Failed) {
            console.error(`[LK CB] Connection FAILED for room SID: ${roomInstance.sid}`);
            setError(prev => `${prev || ''} LiveKit connection failed.`);
        } // Add updateRoomParticipantsList to dependencies
    }, [handleNewStreamerCandidate, isLocalAudioMuted, updateRoomParticipantsList]);

    const handleTrackSubscribed = useCallback((track, publication, remoteParticipant) => {
        console.log(`[LK CB] Track Subscribed: ${track.kind} from ${remoteParticipant.identity}`);
        if (!isCurrentUserStreamerRef.current) { // If viewer, check if this new track is from a streamer
             handleNewStreamerCandidate(remoteParticipant);
        }
    }, [handleNewStreamerCandidate]);

    const handleParticipantConnectedEvent = useCallback((participant) => {
        console.log(`[LK CB] Participant Connected: ${participant.identity}`);
        if (!isCurrentUserStreamerRef.current) { // If viewer, check if new participant is a streamer
            handleNewStreamerCandidate(participant);
        }
        if (roomRef.current) updateRoomParticipantsList(roomRef.current);
    }, [handleNewStreamerCandidate, updateRoomParticipantsList]);

    const handleParticipantDisconnectedEvent = useCallback((participant) => {
        console.log(`[LK CB] Participant Disconnected: ${participant.identity}`);
        if (roomRef.current) updateRoomParticipantsList(roomRef.current);
        setMainParticipant(prevStreamer => {
            if (prevStreamer?.sid === participant.sid) {
                console.log("[LK CB] Main participant (streamer) disconnected. Clearing mainParticipant.");
                return null;
            }
            return prevStreamer;
        });
    }, [updateRoomParticipantsList]);

const handleDataReceived = useCallback((payload, participant) => {
    try {
        const decodedPayload = new TextDecoder().decode(payload);
        const message = JSON.parse(decodedPayload); // Outer message: { type, payload, senderIdentity }

        // Ignore messages sent by self
        if (participant && participant.identity === roomRef.current?.localParticipant?.identity) return;
        if (message.senderIdentity === roomRef.current?.localParticipant?.identity) return;

        console.log(`[Viewer LK Data RX] Type: ${message.type}, Sender: ${participant?.identity || message.senderIdentity}. Full Received Message:`, JSON.stringify(message, null, 2));

        // The actual data for the event (e.g., auction object, chat object) is in message.payload
        const eventSpecificPayload = message.payload;

        switch (message.type) {
            case 'CHAT_MESSAGE':
                // Assuming chatPayload is directly message.payload
                const chatPayload = eventSpecificPayload;
                if (chatPayload && chatPayload.text) { // Basic validation
                    setChatMessages(prevMessages => {
                        const newMsg = {
                            id: `lk-${participant?.sid || 'unknown'}-${Date.now()}`,
                            user: {
                                username: chatPayload.username, avatar: chatPayload.avatar,
                                isMod: safeParseMetadata(participant?.metadata).role === 'moderator',
                                identity: participant?.identity || message.senderIdentity,
                            },
                            text: chatPayload.text, timestamp: chatPayload.timestamp,
                        };
                        // Prevent duplicates if message is somehow processed multiple times quickly
                        if (prevMessages.some(m => m.text === newMsg.text && m.user.identity === newMsg.user.identity && Math.abs(new Date(m.timestamp).getTime() - new Date(newMsg.timestamp).getTime()) < 2000)) {
                            return prevMessages;
                        }
                        return [...prevMessages, newMsg];
                    });
                } else {
                    console.error("[Viewer LK Data RX] CHAT_MESSAGE received with invalid payload:", chatPayload);
                }
                break;

            case 'AUCTION_STARTED':
            case 'AUCTION_UPDATED': {
                const auctionData = eventSpecificPayload; // Use 'auctionData' for clarity in these cases
                console.log(`[LK Data RX] Processing ${message.type}. Auction Data:`, JSON.stringify(auctionData, null, 2));
                if (auctionData && auctionData.Product) {
                    setCurrentAuction(auctionData);
                    setAuctionError(null);
                    console.log(`[LK Data RX] ${message.type} processed, currentAuction updated.`);
                } else {
                    console.error(`[LK Data RX] ${message.type} received invalid payload:`, auctionData);
                    setAuctionError(`Received incomplete data for ${message.type}.`);
                }
                break;
            }
            case 'AUCTION_ENDED': { // Use block scope for AUCTION_ENDED
                const auctionDataEnded = eventSpecificPayload; // Use 'auctionDataEnded' for clarity
                console.log(`[LK Data RX - AUCTION_ENDED] Received payload:`, JSON.stringify(auctionDataEnded, null, 2));
                if (auctionDataEnded && auctionDataEnded.Product && ['sold', 'unsold', 'cancelled'].includes(auctionDataEnded.status)) {
                    setCurrentAuction(auctionDataEnded);
                    console.log("[LK Data RX - AUCTION_ENDED] setCurrentAuction called with FINAL ended state:", auctionDataEnded);
                    setAuctionError(null);
                } else {
                    console.error(`[LK Data RX - AUCTION_ENDED] Payload issue. Payload:`, auctionDataEnded);
                    // Fallback logic as before
                    if (auctionDataEnded && ['sold', 'unsold', 'cancelled'].includes(auctionDataEnded.status)) {
                        setCurrentAuction(prev => ({ ...prev, status: auctionDataEnded.status, winner: auctionDataEnded.winner, current_price: auctionDataEnded.current_price, Product: prev?.Product || auctionDataEnded.Product })); // Preserve product if possible
                        console.warn("[LK Data RX - AUCTION_ENDED] Partially updated auction status due to missing/incomplete Product in payload.");
                    } else {
                         setAuctionError("Received incomplete auction end data.");
                    }
                }
                break;
            } 
            default:
                console.warn('[LiveKit Data RECEIVED] Unknown message type:', message.type);
        }
    } catch (e) {
        console.error('[LiveKit Data RECEIVED] Error processing data message:', e, "Raw payload was:", payload ? new TextDecoder().decode(payload) : "Payload was undefined/null");
    }
}, [safeParseMetadata]);

    const handleAudioPlaybackChange = useCallback((roomInstance) => {
        if (roomInstance) {
            setCanPlaybackAudio(roomInstance.canPlaybackAudio);
            setStatusMessage(prev => prev.includes("Audio muted")
                ? (roomInstance.canPlaybackAudio ? prev.replace(" (Audio muted, click page to enable)", "") : prev)
                : (roomInstance.canPlaybackAudio ? prev : prev + " (Audio muted, click page to enable)")
            );
        }
    },[]);

    // ========================================================================
    //  END LIVEKIT EVENT HANDLERS
    // ========================================================================


    // Effect 1: Initialization (Stream Details, Active Auction, LiveKit Token, Chat History)
    useEffect(() => {

        if (!streamId) {
            setError("Stream ID is missing.");
            setIsLoadingStreamData(false);
            return;
        }
        let isMounted = true;
        console.log(`[StreamPage EFFECT - INIT START] streamId: ${streamId}. User: ${currentUser?.username || 'Guest'}`);
        setIsLoadingStreamData(true);
        setStatusMessage("Fetching stream details...");
        setError(null); setAuctionError(null);
        setLiveKitToken(null); setLiveKitUrl(null);
        setStreamDataFromAPI(null); setCurrentAuction(null); setChatMessages([]);
        setMainParticipant(null); setLocalParticipantState(null);
        setIsFollowingHost(false); setRoomParticipants([]); // Reset follow status and participants

        const init = async () => {
            try {
                console.log("[StreamPage Init] 1. Fetching core stream details...");
                const apiStreamDataResponse = await streamService.getStreamDetails(streamId);
                if (!isMounted) return;
                if (!apiStreamDataResponse) {
                    console.error("[StreamPage Init] Failed to fetch core stream details: API returned null or undefined.");
                    throw new Error("Stream data could not be loaded. The stream may not exist or there was a server issue.");
                }
                console.log("[StreamPage Init]    Core stream details fetched:", apiStreamDataResponse);
                setStreamDataFromAPI(apiStreamDataResponse);

                console.log(`[StreamPage Init] 2. Attempting to fetch active auctions for stream ID: ${streamId}`);
                try {
                    const streamAuctions = await auctionService.getAllAuctions({ streamId: streamId, status: 'active' });
                    console.log('[StreamPage Init]    Raw fetched streamAuctions:', JSON.stringify(streamAuctions, null, 2));
                    if (isMounted && streamAuctions && streamAuctions.length > 0) {
                        setCurrentAuction(streamAuctions[0]);
                        console.log("[StreamPage Init]    Active auction loaded and set from initial fetch:", streamAuctions[0]);
                    } else if (isMounted) {
                        console.log("[StreamPage Init]    No active auction found from initial fetch or call was empty.");
                        setCurrentAuction(null);
                    }
                } catch (aucErr) {
                    console.warn("[StreamPage Init]    Could not fetch active auction on load:", aucErr.message, aucErr.response?.data);
                    if(isMounted) setCurrentAuction(null);
                }

                const userIsStreamerCheck = currentUser?.user_id === apiStreamDataResponse.user_id;
                setIsCurrentUserStreamer(userIsStreamerCheck);
                console.log(`[StreamPage Init] 3. Is current user streamer? ${userIsStreamerCheck}`);

                setStatusMessage(userIsStreamerCheck ? "Fetching streamer token..." : "Fetching viewer token...");
                console.log(`[StreamPage Init] 4. Fetching LiveKit token. IsStreamer: ${userIsStreamerCheck}`);
                let tokenResponse;
                if (userIsStreamerCheck) {
                    if (!isAuthenticated) throw new Error("Login required to start/host a stream.");
                    tokenResponse = await streamService.goLiveStreamer(streamId);
                } else {
                    tokenResponse = await streamService.joinLiveStreamViewer(streamId);
                }
                if (!isMounted) return;
                if (tokenResponse && tokenResponse.token && tokenResponse.livekitUrl) {
                    setLiveKitToken(tokenResponse.token);
                    setLiveKitUrl(tokenResponse.livekitUrl);
                    console.log("[StreamPage Init]    LiveKit token and URL acquired.");
                } else {
                    throw new Error(tokenResponse?.message || "Failed to obtain LiveKit connection details.");
                }

                // 6. Fetch initial follow status (if logged in and not the host)
                if (isMounted && currentUser && currentUser.user_id !== apiStreamDataResponse.user_id) {
                    console.log("[StreamPage Init] 6. Fetching follow status...");
                    try {
                        const followStatus = await userService.getFollowingStatus(apiStreamDataResponse.user_id);
                        if (isMounted) setIsFollowingHost(followStatus.isFollowing);
                        console.log(`[StreamPage Init]    Follow status for host ${apiStreamDataResponse.user_id}: ${followStatus.isFollowing}`);
                    } catch (followErr) {
                        console.warn("[StreamPage Init]    Could not fetch follow status:", followErr.message);
                        // Keep isFollowingHost as false
                    }
                }

                console.log("[StreamPage Init] 5. Fetching chat history...");
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
                    console.log("[StreamPage Init]    Chat history loaded:", formattedHistory.length, "messages.");
                }
            } catch (err) {
                if (isMounted) {
                    const errorMessage = err?.response?.data?.message || err?.message || "An error occurred while loading stream data.";
                    setError(errorMessage);
                    console.error("[StreamPage Init] CRITICAL ERROR during initialization:", err);
                    setStatusMessage("Error: Could not initialize stream page.");
                }
            } finally {
                if (isMounted) {
                    setIsLoadingStreamData(false);
                    console.log("[StreamPage Init] Initialization sequence finished. isLoadingStreamData:", false);
                }
            }
        };
        init();
        return () => { isMounted = false; console.log(`[StreamPage EFFECT - INIT CLEANUP] Unmounting streamId: ${streamId}`); };
    }, [streamId, currentUser?.user_id, isAuthenticated]);


    // Effect 2: LiveKit Room Connection & Management
    useEffect(() => {
        if (!liveKitUrl || !liveKitToken || isLoadingStreamData) {
            console.log(`[StreamPage EFFECT - LiveKit Connection] SKIPPING: URL/Token missing or still loading initial data. HasURL:${!!liveKitUrl}, HasToken:${!!liveKitToken}, IsLoadingData:${isLoadingStreamData}`);
            return;
        }
        // This check prevents re-connecting if the room instance for the *current* token/url already exists and is connected/connecting
        if (roomRef.current && roomRef.current.url === liveKitUrl && (roomRef.current.state === ConnectionState.Connected || roomRef.current.state === ConnectionState.Connecting)) {
            console.log(`[StreamPage EFFECT - LiveKit Connection] SKIPPING: Already connected or connecting to ${liveKitUrl}`);
            return;
        }
        // If there's an old room instance (e.g., from a previous failed attempt or different token), disconnect it.
        if (roomRef.current) {
            console.warn("[StreamPage EFFECT - LiveKit Connection] Existing roomRef found. Disconnecting before new connection.");
            roomRef.current.disconnect(true);
            roomRef.current = null;
        }

        console.log(`[StreamPage EFFECT - LiveKit Connection] ATTEMPTING to connect. URL: ${liveKitUrl}`);
        setStatusMessage("Connecting to LiveKit room...");

        const room = new Room({ logLevel: LogLevel.info, adaptiveStream: true, dynacast: true, url: liveKitUrl }); // Store URL for check
        roomRef.current = room;

        // Event listeners are now stable references due to useCallback
        room.on(RoomEvent.ConnectionStateChanged, (state) => handleConnectionStateChange(state, room));
        room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
        room.on(RoomEvent.ParticipantConnected, handleParticipantConnectedEvent);
        room.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnectedEvent);
        room.on(RoomEvent.DataReceived, handleDataReceived);
        room.on(RoomEvent.AudioPlaybackStatusChanged, () => handleAudioPlaybackChange(room));

        room.connect(liveKitUrl, liveKitToken)
            .then(() => {
                console.log('[StreamPage EFFECT - LiveKit Connection] room.connect() promise RESOLVED. Room state:', room.state, 'SID:', room.sid);
            })
            .catch(err => {
                console.error("[StreamPage EFFECT - LiveKit Connection] room.connect() promise REJECTED:", err);
                setError(prev => `${prev || ''} LiveKit Connection Failed: ${err.message}`);
                setStatusMessage("Error: LiveKit Connection Failed");
                if (roomRef.current === room) {
                    room.removeAllListeners(); room.disconnect(true); roomRef.current = null;
                }
            });
        return () => {
            console.log("[StreamPage EFFECT - LiveKit Connection CLEANUP] Disconnecting room SID:", room?.sid);
            if (roomRef.current === room) roomRef.current = null;
            room.removeAllListeners();
            room.disconnect(true);
        };
    }, [
        liveKitUrl, liveKitToken, isLoadingStreamData,
        handleConnectionStateChange, handleTrackSubscribed, handleParticipantConnectedEvent,
        handleParticipantDisconnectedEvent, handleDataReceived, handleAudioPlaybackChange // These are now stable
    ]);

    
    console.log("[STREAM PAGE RENDER] currentAuction state:",
        currentAuction ? { id: currentAuction.auction_id, status: currentAuction.status, productTitle: currentAuction.Product?.title } : null
    );
    console.log("[STREAM PAGE RENDER] isCurrentUserStreamer:", isCurrentUserStreamer);



    // --- Component Actions (Callbacks for children) ---
    const sendLiveKitData = useCallback(async (type, payload) => {
        if (roomRef.current && roomRef.current.localParticipant) {
            try {
                const dataToSend = {
                    type,
                    payload,
                    senderIdentity: roomRef.current.localParticipant.identity,
                };
                const encodedPayload = new TextEncoder().encode(JSON.stringify(dataToSend));
                await roomRef.current.localParticipant.publishData(encodedPayload, DataPacket_Kind.RELIABLE);
                console.log(`[LiveKit Data SENT] Type: ${type}, From: ${roomRef.current.localParticipant.identity}, Payload:`, payload);
            } catch (e) {
                console.error(`[LiveKit Data SEND ERROR] Type: ${type}`, e);
            }
        } else {
            console.warn(`[LiveKit Data SEND] Cannot send data, no local participant or room is ready. Type: ${type}`);
        }
    }, []);

    const handleAuctionAction = useCallback((action) => {
        if (action.type === 'AUCTION_STARTED') {
            const actualAuctionObject = action.payload.auction;
            console.log("[Streamer's StreamPage] handleAuctionAction: AUCTION_STARTED. Extracted auction object:", JSON.stringify(actualAuctionObject, null, 2));
            setCurrentAuction(actualAuctionObject);
            setAuctionError(null);
            sendLiveKitData('AUCTION_STARTED', actualAuctionObject);
        }
    }, [sendLiveKitData]);

    const handleToggleLocalAudioMute = useCallback(async () => {
        if (!roomRef.current?.localParticipant || !isCurrentUserStreamerRef.current) {
            console.log("[StreamPage] ToggleLocalAudioMute: No local participant or not streamer.");
            return;
        }
        const newMutedState = !isLocalAudioMuted;
        try {
            await roomRef.current.localParticipant.setMicrophoneEnabled(!newMutedState);
            setIsLocalAudioMuted(newMutedState);
            console.log(`[StreamPage] Toggled local mic. New state (mic enabled): ${!newMutedState}`);
        } catch (err) {
            console.error("[StreamPage] Error toggling local microphone:", err);
        }
    }, [isLocalAudioMuted]);

    const handleToggleRemoteAudioMute = useCallback(() => {
        if (!isCurrentUserStreamerRef.current) {
            setIsRemoteAudioMuted(prev => {
                console.log(`[StreamPage] Toggling remote audio mute for viewer. New muted state: ${!prev}`);
                return !prev;
            });
        }
    }, []);

    const sendChatMessageViaLiveKit = useCallback(async (text) => {
        if (!roomRef.current?.localParticipant || !text.trim() || !currentUser || !streamId) {
            console.warn("[StreamPage] sendChatMessage: Cannot send. Missing requirements.", { hasLocalP: !!roomRef.current?.localParticipant, text, currentUser, streamId });
            return;
        }
        const clientTimestamp = new Date().toISOString();
        const chatPayload = {
            text: text.trim(),
            username: currentUser.username,
            avatar: currentUser.profile_picture_url,
            timestamp: clientTimestamp,
        };

        console.log("[StreamPage] Attempting to send CHAT_MESSAGE via LiveKit:", chatPayload);
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
            console.log("[StreamPage] Chat message saved to DB successfully.");
        } catch (dbError) {
            console.error("[StreamPage] Failed to save chat message to DB:", dbError);
        }
    }, [currentUser, streamId, sendLiveKitData]);

    const handlePlaceBid = useCallback(async (auctionId, amount) => {
        console.log(`[StreamPage] handlePlaceBid triggered. Auction ID: ${auctionId}, Amount: ${amount}, User: ${currentUser?.username}`);

        if (!currentUser) {
            setAuctionError("You must be logged in to bid.");
            console.log("[StreamPage handlePlaceBid] Error: User not logged in.");
            return;
        }
        if (isCurrentUserStreamerRef.current) {
            setAuctionError("Streamers cannot bid in their own auctions.");
            console.log("[StreamPage handlePlaceBid] Error: Streamer attempting to bid.");
            return;
        }
        if (!currentAuction || !currentAuction.Product) {
            setAuctionError("No active auction product details available to bid on.");
            console.log("[StreamPage handlePlaceBid] Error: currentAuction or Product details missing.", currentAuction);
            return;
        }
        if (currentAuction.Product.user_id === currentUser.user_id) {
            setAuctionError("You cannot bid on your own product.");
            console.log("[StreamPage handlePlaceBid] Error: User attempting to bid on own product.");
            return;
        }
        if (currentAuction.status !== 'active') {
            setAuctionError(`Auction is not active (status: ${currentAuction.status}). Cannot place bid.`);
            console.log(`[StreamPage handlePlaceBid] Error: Auction not active. Status: ${currentAuction.status}`);
            return;
        }

        setIsAuctionLoading(true);
        setAuctionError(null);
        console.log(`[StreamPage handlePlaceBid] Calling auctionService.placeBid for auction ${auctionId}, amount ${amount}`);
        try {
            const bidResult = await auctionService.placeBid(auctionId, amount);
            console.log("[StreamPage handlePlaceBid] Bid backend call successful. Raw bidResult:", bidResult);

            if (bidResult && bidResult.auction) {
                setCurrentAuction(bidResult.auction);
                console.log("[StreamPage handlePlaceBid] setCurrentAuction after successful bid from backend response:", bidResult.auction);
                sendLiveKitData('AUCTION_UPDATED', bidResult.auction);
                console.log("[StreamPage handlePlaceBid] Sent AUCTION_UPDATED via LiveKit with new auction state:", bidResult.auction);
            } else {
                console.warn("[StreamPage handlePlaceBid] Bid placed, but backend response did not include updated auction data. Response:", bidResult);
            }
        } catch (err) {
            const errMsg = err.message || "Failed to place bid. Please try again.";
            setAuctionError(errMsg);
            console.error("[StreamPage handlePlaceBid] Error placing bid:", err);
        } finally {
            setIsAuctionLoading(false);
        }
    }, [currentUser, currentAuction, sendLiveKitData]);

    const handleFollowToggle = useCallback(async () => {
        if (!currentUser || !streamDataFromAPI?.User || followLoading) return;
        if (currentUser.user_id === streamDataFromAPI.User.user_id) return; // Cannot follow self

        setFollowLoading(true);
        const hostId = streamDataFromAPI.User.user_id;
        try {
            if (isFollowingHost) {
                await userService.unfollowUser(hostId);
                setIsFollowingHost(false);
                console.log(`[StreamPage] Unfollowed user ${hostId}`);
            } else {
                await userService.followUser(hostId);
                setIsFollowingHost(true);
                console.log(`[StreamPage] Followed user ${hostId}`);
            }
        } catch (err) {
            console.error("[StreamPage] Error toggling follow:", err);
            // Optionally show an error to the user via a toast or message state
            setError(prev => `${prev || ''} Follow action failed: ${err.message}.`);
        } finally {
            setFollowLoading(false);
        }
    }, [currentUser, streamDataFromAPI, isFollowingHost, followLoading]);


    const handleRetryConnection = useCallback(() => {
        console.log("[StreamPage] Retrying connection...");
        setError(null); setAuctionError(null); setStatusMessage("Retrying...");
        setIsLoadingStreamData(true);
        setLiveKitToken(null); setLiveKitUrl(null);
        if (roomRef.current) {
            roomRef.current.disconnect(true);
            roomRef.current = null;
        }
        // Re-trigger initial useEffect by clearing streamId or navigating away and back (complex)
        // Simpler: just re-fetch everything. We can simulate this by resetting a key dependency.
        // For now, the existing logic in useEffect (streamId) should re-trigger if streamId changes
        // or component re-mounts. The current retry clears tokens to re-trigger LiveKit part.
        // To re-trigger the *initial* data fetch, you might need to navigate or force a re-render differently.
        // The current setup should try to re-fetch tokens and connect to LiveKit if tokens were the issue.
        // If the initial streamService.getStreamDetails failed, this retry won't re-call that part
        // without more complex state management or a full re-mount.
        // A full re-init means calling the whole useEffect[streamId] logic again.
        // This simple retry focuses on LiveKit connection part.
    }, []);

    // --- UI Rendering Logic ---
    if (isLoadingStreamData) {
        return (
            <div className="flex h-screen items-center justify-center bg-black">
                <span className="loading loading-lg loading-dots text-white"></span>
                <p className="ml-4 text-white">Loading Stream...</p>
                <p className="text-xs text-neutral-400">Status: {statusMessage}</p>
            </div>
        );
    }
    if (error) {
        return (
            <div className="flex flex-col h-screen items-center justify-center bg-neutral-900 text-white p-4 text-center">
                <FiAlertTriangle className="w-16 h-16 text-error mb-4"/>
                <h2 className="text-2xl font-semibold text-error mb-4">Stream Unavailable</h2>
                <p className="mb-1 text-sm">Status: {statusMessage}</p>
                <p className="mb-6 max-w-md text-red-400/80">{error}</p>
                <div className="space-x-4">
                    <button onClick={handleRetryConnection} className="btn btn-warning">Try Again</button>
                    <button onClick={() => navigate('/')} className="btn btn-primary">Go Home</button>
                </div>
            </div>
        );
    }
    if (!liveKitToken || !liveKitUrl) {
        return (
            <div className="flex h-screen items-center justify-center bg-black">
                <FiAlertTriangle className="w-12 h-12 text-warning mb-3"/>
                <p className="text-white">Could not retrieve connection details for the stream. Please try again.</p>
                <p className="text-xs text-neutral-400 ml-2">Status: {statusMessage}</p>
                 <button onClick={handleRetryConnection} className="btn btn-sm btn-outline btn-warning ml-4">Retry</button>
            </div>
        );
    }
    if (!streamDataFromAPI) {
         return (
            <div className="flex flex-col h-screen items-center justify-center bg-neutral-900 text-white p-4 text-center">
                <FiAlertTriangle className="w-16 h-16 text-warning mb-4"/>
                <h2 className="text-2xl font-semibold text-warning mb-4">Stream Data Not Found</h2>
                <p className="mb-6 max-w-md">The details for this stream could not be loaded. It might be an invalid stream ID.</p>
                <button onClick={() => navigate('/')} className="btn btn-primary">Go Home</button>
            </div>
        );
    }

    const participantForVideoPlayer = isCurrentUserStreamer ? localParticipantState : mainParticipant;
    const hostUser = streamDataFromAPI?.User
        ? {
            user_id: streamDataFromAPI.User.user_id,
            username: streamDataFromAPI.User.username,
            avatarUrl: streamDataFromAPI.User.profile_picture_url, // Use the correct field
            rating: streamDataFromAPI.User.seller_rating || 0,
            isFollowed: isFollowingHost, // Use state here
          }
        : { user_id: null, username: 'Streamer', avatarUrl: '', rating: 0, isFollowed: false };

    const streamHeaderProps = {
        id: streamDataFromAPI?.stream_id,
        title: streamDataFromAPI?.title,
        host: hostUser,
        viewerCount: (roomRef.current?.remoteParticipants?.size || 0) + (localParticipantState ? 1 : 0),
        streamUrl: window.location.href,
    };
    const productsForProductList = streamDataFromAPI?.Products || [];

    console.log(`[StreamPage RENDER] currentAuction ID: ${currentAuction ? currentAuction.auction_id : 'null'}, Status: ${currentAuction ? currentAuction.status : 'N/A'}`);
    console.log(`[StreamPage RENDER] participantForVideoPlayer: ${participantForVideoPlayer?.identity || 'None'}`);
    console.log(`[StreamPage RENDER] isCurrentUserStreamer: ${isCurrentUserStreamer}`);
    console.log(`[StreamPage RENDER] isFollowingHost: ${isFollowingHost}`);
    console.log(`[StreamPage RENDER] roomParticipants count: ${roomParticipants.length}`);


    return (
        <div className="flex flex-col h-screen bg-neutral-900 text-white overflow-hidden"
             onClick={() => { if (roomRef.current && !roomRef.current.canPlaybackAudio) {roomRef.current.startAudio().catch(e => console.warn("Error starting audio on click", e));} }}
        >
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

                <div className="flex-1 flex items-center justify-center bg-black overflow-hidden px-0 md:px-4 py-0 md:py-4">
                    <StreamVideoPlayer
                        mainParticipant={participantForVideoPlayer}
                        isLocalStreamer={isCurrentUserStreamer && participantForVideoPlayer === localParticipantState}
                        isAudioMuted={isCurrentUserStreamer ? isLocalAudioMuted : isRemoteAudioMuted}
                        onToggleAudioMute={isCurrentUserStreamer ? handleToggleLocalAudioMute : handleToggleRemoteAudioMute}
                        thumbnailUrl={streamDataFromAPI?.thumbnail_url}
                        currentAuctionOnVideo={currentAuction}
                    />
                </div>

                <aside className={`w-full md:w-80 lg:w-96 bg-black border-l border-neutral-800 flex flex-col overflow-hidden fixed bottom-0 left-0 h-[60vh] md:h-full md:static transform ${activeTab === 'chat-visible-mobile' ? 'translate-y-0' : 'translate-y-full'} md:translate-y-0 transition-transform duration-300 ease-in-out z-20`}>
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
                        (activeTab === 'chat-visible-mobile' || (typeof window !== 'undefined' && window.innerWidth >= 768)) && (
                         <div className="bg-neutral-900 p-3 sm:p-4 border-t border-neutral-800 text-neutral-500 text-sm text-center shrink-0">
                            No active auction.
                         </div>
                        )
                    )}
                    {auctionError && <div className="alert alert-error p-2 text-xs justify-start mx-2 my-1 shadow-lg"><FiAlertTriangle className="mr-1"/><span>{auctionError}</span></div>}
                    <div className="flex-grow overflow-y-auto">
                        <StreamChat
                            messages={chatMessages} activeTab={activeTab} onTabChange={setActiveTab}
                            viewerCount={streamHeaderProps.viewerCount} onSendMessage={sendChatMessageViaLiveKit}
                            localParticipantIdentity={roomRef.current?.localParticipant?.identity}
                            roomParticipantsForChat={roomParticipants} // Pass the list of participants
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