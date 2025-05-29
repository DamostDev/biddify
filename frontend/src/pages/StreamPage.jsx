// src/pages/StreamPage.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Room, RoomEvent, RemoteParticipant, LocalParticipant,
    Participant, ConnectionState, Track, DataPacket_Kind,
    VideoPresets
} from 'livekit-client';
import useAuthStore from '../services/authStore.js';
import streamService from '../services/streamService.js';

import StreamVideoPlayer from '../components/stream/StreamVideoPlayer';
import StreamChat from '../components/stream/StreamChat';
import StreamProductList from '../components/stream/StreamProductList';
import StreamAuctionControls from '../components/stream/StreamAuctionControls';
import StreamHeader from '../components/stream/StreamHeader';
import { FiX, FiMessageSquare } from 'react-icons/fi';

function StreamPage() {
    const { streamId } = useParams();
    const navigate = useNavigate();
    const { user: currentUser, isAuthenticated } = useAuthStore();

  const [streamDataFromAPI, setStreamDataFromAPI] = useState(null);
  const [room, setRoom] = useState(null);
  const [mainParticipant, setMainParticipant] = useState(null);
  const [isCurrentUserStreamer, setIsCurrentUserStreamer] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // True initially for fetching stream details
  const [isConnectingToLiveKit, setIsConnectingToLiveKit] = useState(false); // For LiveKit connection phase
  const [error, setError] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [isLocalAudioMuted, setIsLocalAudioMuted] = useState(false);
  const [isRemoteAudioMuted, setIsRemoteAudioMuted] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  const livekitConnectionDetailsRef = useRef(null);

  const safeParseMetadata = (metadataString) => {
    let meta = {};
    if (!metadataString) return meta;
    try {
      meta = JSON.parse(metadataString);
    } catch (e) {
      console.warn("Failed to parse participant metadata:", metadataString, e);
    }
    return meta;
  };

  // --- LiveKit Event Handlers --- (These remain largely the same)
  const handleParticipantConnected = useCallback((participant) => {
    console.log('[LK Event] Participant connected:', participant.identity, participant.metadata);
    const meta = safeParseMetadata(participant.metadata);
    if (!isCurrentUserStreamer && meta.role === 'streamer' && !mainParticipant) {
      setMainParticipant(participant);
    }
  }, [isCurrentUserStreamer, mainParticipant]);

  const handleParticipantDisconnected = useCallback((participant) => {
    console.log('[LK Event] Participant disconnected:', participant.identity);
    if (mainParticipant?.sid === participant.sid) {
      setMainParticipant(null);
    }
  }, [mainParticipant]);

  const handleTrackSubscribed = useCallback((track, publication, participant) => {
    console.log('[LK Event] Track subscribed:', track.kind, 'for', participant.identity);
    const meta = safeParseMetadata(participant.metadata);
    if (track.kind === Track.Kind.Video) {
      if (meta.role === 'streamer' && (!mainParticipant || mainParticipant.sid === participant.sid)) {
        setMainParticipant(participant);
      } else if (!isCurrentUserStreamer && !mainParticipant) {
        setMainParticipant(participant);
      }
    }
  }, [isCurrentUserStreamer, mainParticipant]);

  const handleDataReceived = useCallback((payload, p, kind) => {
    const decoder = new TextDecoder();
    const messageData = JSON.parse(decoder.decode(payload));
    console.log('[LK Event] Data received:', messageData, 'from:', p?.identity);
    if (messageData.type === 'chat') {
      setChatMessages(prev => [...prev, {
        id: `lk-${Date.now()}-${Math.random()}`,
        user: { username: messageData.username || p?.identity || 'User', avatar: messageData.avatar, isMod: messageData.isMod },
        text: messageData.text,
      }]);
    }
  }, []);

  const handleConnectionStateChange = useCallback((state) => {
    console.log('[LK Event] Connection State:', state);
    if (state === ConnectionState.Disconnected) {
      console.warn('[LK Event] Disconnected from LiveKit room. Cleaning up.');
      setRoom(null);
      setMainParticipant(null);
      setIsConnectingToLiveKit(false);
      // setError("Disconnected from the live stream. Please try rejoining."); // Optional: inform user
    } else if (state === ConnectionState.Connected) {
      setIsConnectingToLiveKit(false);
    } else if (state === ConnectionState.Connecting) {
      setIsConnectingToLiveKit(true);
    }
  }, []);

  // --- Initialization: Fetch Stream Data & LiveKit Token ---
  useEffect(() => {
    if (!streamId) {
      setError("Stream ID is missing.");
      setIsLoading(false);
      return;
    }
    let isMounted = true;
    setIsLoading(true);
    setError(null);
    setStreamDataFromAPI(null); // Reset on streamId change
    livekitConnectionDetailsRef.current = null;

    console.log(`[EFFECT 1 - Init] StreamPage mounted/streamId changed. streamId: ${streamId}`);

    const init = async () => {
      try {
        console.log("[EFFECT 1 - Init] Fetching stream details for streamId:", streamId);
        const apiStreamData = await streamService.getStreamDetails(streamId);
        console.log("[EFFECT 1 - Init] Got apiStreamData:", apiStreamData);
        if (!isMounted) return;
        setStreamDataFromAPI(apiStreamData); // Set API data first

        const userIsStreamer = currentUser?.user_id === apiStreamData.user_id;
        setIsCurrentUserStreamer(userIsStreamer);
        console.log("[EFFECT 1 - Init] User is streamer:", userIsStreamer);

        let tokenResponse;
        if (userIsStreamer) {
          if (!isAuthenticated) {
            throw new Error("You must be logged in to start your stream.");
          }
          console.log("[EFFECT 1 - Init] Attempting goLiveStreamer...");
          tokenResponse = await streamService.goLiveStreamer(streamId);
        } else {
          console.log("[EFFECT 1 - Init] Attempting joinLiveStreamViewer...");
          tokenResponse = await streamService.joinLiveStreamViewer(streamId);
        }
        console.log("[EFFECT 1 - Init] Got tokenResponse:", tokenResponse);
        if (!isMounted) return;

        if (tokenResponse && tokenResponse.token && tokenResponse.livekitUrl) {
          livekitConnectionDetailsRef.current = {
            token: tokenResponse.token,
            url: tokenResponse.livekitUrl,
            roomName: tokenResponse.roomName
          };
          // The actual room connection will happen in the next useEffect
          // It's important that setIsLoading(false) happens AFTER livekitConnectionDetailsRef is set
        } else {
          throw new Error(tokenResponse?.message || "Failed to get LiveKit connection details.");
        }
      } catch (err) {
        console.error("[EFFECT 1 - Init] Initialization Error:", err);
        if (isMounted) {
          const errMsg = err?.response?.data?.message || err?.message || "Failed to load stream.";
          setError(errMsg);
        }
      } finally {
        if (isMounted) setIsLoading(false); // Loading for initial data fetch is done
      }
    };
    init();
    return () => { isMounted = false; };
  }, [streamId, currentUser, isAuthenticated]); // Dependencies are correct

  // --- LiveKit Room Connection & Management ---
  useEffect(() => {
    console.log("[EFFECT 2 - LK Connect] Triggered. livekitConnectionDetailsRef.current:", livekitConnectionDetailsRef.current, "Room state:", room, "isLoading:", isLoading);
    if (!livekitConnectionDetailsRef.current || room || isLoading) {
        // ... (logging for skipping)
        return;
    }

    const { token, url, roomName: targetRoomName } = livekitConnectionDetailsRef.current; // Renamed to avoid confusion
    console.log(`[EFFECT 2 - LK Connect] Attempting to connect. URL: ${url}, TargetRoomName: ${targetRoomName}, Token: ${token ? 'present' : 'MISSING'}`);

    if(!token || !url) {
        console.error("[EFFECT 2 - LK Connect] Token or URL is missing.");
        setError("Connection details missing for live stream.");
        setIsConnectingToLiveKit(false);
        return;
    }
    setIsConnectingToLiveKit(true);

    const newRoom = new Room({
      adaptiveStream: true,
      dynacast: true,
      // Consider adding loglevel for more detailed LiveKit client logs during debugging
      // import { LogLevel } from 'livekit-client';
      // logLevel: LogLevel.debug,
    });

    // ... (event listeners as before) ...
    newRoom.on(RoomEvent.ParticipantConnected, handleParticipantConnected);
    newRoom.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
    newRoom.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
    newRoom.on(RoomEvent.DataReceived, handleDataReceived);
    newRoom.on(RoomEvent.ConnectionStateChanged, handleConnectionStateChange);
    newRoom.on(RoomEvent.Disconnected, () => {
      console.log("[EFFECT 2 - LK Connect] Room disconnected event. Cleaning up state.");
      setMainParticipant(null);
      setIsConnectingToLiveKit(false);
    });


    newRoom.connect(url, token)
      .then(async (resolvedRoomObject) => { // Use a different name for clarity
        console.log("[EFFECT 2 - LK Connect] .then() callback executed. Value of resolvedRoomObject:", resolvedRoomObject);

        if (!resolvedRoomObject || typeof resolvedRoomObject.name === 'undefined') { // More robust check
          console.error("[EFFECT 2 - LK Connect] CRITICAL: resolvedRoomObject is invalid or not a Room instance after connect() resolution!", resolvedRoomObject);
          // Attempt to get more info if it's an object but not a Room
          if (typeof resolvedRoomObject === 'object' && resolvedRoomObject !== null) {
            console.error("[EFFECT 2 - LK Connect] Properties of resolvedRoomObject:", Object.keys(resolvedRoomObject).join(', '));
          }
          throw new Error("LiveKit connection resolved but the room object is invalid or missing properties.");
        }

        console.log('[EFFECT 2 - LK Connect] Successfully connected to LiveKit room:', resolvedRoomObject.name);
        setRoom(resolvedRoomObject); // Set the validated room object

        if (isCurrentUserStreamer) {
          console.log("[EFFECT 2 - LK Connect] Streamer path. Setting main participant and enabling media...");
          setMainParticipant(resolvedRoomObject.localParticipant);
          try {
            await resolvedRoomObject.localParticipant.setCameraEnabled(true);
            console.log("[EFFECT 2 - LK Connect] Camera enabled.");
            await resolvedRoomObject.localParticipant.setMicrophoneEnabled(!isLocalAudioMuted);
            console.log("[EFFECT 2 - LK Connect] Microphone enabled with muted state:", isLocalAudioMuted);
          } catch (mediaErr) {
            console.error("[EFFECT 2 - LK Connect] Error enabling media for streamer:", mediaErr);
            setError(`Could not enable camera/microphone. Please check permissions. Details: ${mediaErr.message}`);
            await resolvedRoomObject.disconnect(true); // Disconnect if streamer can't share media
          }
        } else {
          // ... (viewer logic as before, using resolvedRoomObject.participants) ...
          console.log("[EFFECT 2 - LK Connect] Viewer path. Checking for existing streamer.");
          let streamerFound = false;
          for (const [, p] of resolvedRoomObject.participants) {
            const meta = safeParseMetadata(p.metadata);
            if (meta.role === 'streamer') {
              console.log("[EFFECT 2 - LK Connect] Found streamer among existing participants:", p.identity);
              setMainParticipant(p);
              streamerFound = true;
              break;
            }
          }
          if (!streamerFound) {
            console.log("[EFFECT 2 - LK Connect] No streamer found yet among connected participants.");
          }
        }
      })
      .catch(err => {
        console.error("[EFFECT 2 - LK Connect] LiveKit Connection Failed (in .catch block):", err);
        // Check if the error object has more details, e.g., from LiveKit itself
        if (err && err.message) {
            setError(err.message);
        } else {
            setError("Could not connect to the live stream due to an unknown error.");
        }
        setIsConnectingToLiveKit(false);
      });

    return () => { /* ... cleanup ... */ };
  }, [
      isLoading,
      isCurrentUserStreamer,
      handleParticipantConnected,
      handleParticipantDisconnected,
      handleTrackSubscribed,
      handleDataReceived,
      handleConnectionStateChange,
      isLocalAudioMuted
  ]);


  // --- UI Interaction Callbacks --- (Largely the same)
  const handleToggleLocalAudioMute = useCallback(async () => {
    if (room && room.localParticipant && isCurrentUserStreamer) {
      const newMutedState = !isLocalAudioMuted;
      try {
        await room.localParticipant.setMicrophoneEnabled(!newMutedState);
        setIsLocalAudioMuted(newMutedState);
      } catch (err) { console.error("Error toggling local mic:", err); }
    }
  }, [room, isCurrentUserStreamer, isLocalAudioMuted]);

    const handleToggleRemoteAudioMute = useCallback(() => {
        if (!isCurrentUserStreamerRef.current) setIsRemoteAudioMuted(prev => !prev);
    }, []);

  const sendChatMessageViaLiveKit = useCallback((text) => {
    if (room && room.localParticipant && text.trim()) {
      const messageData = { type: 'chat', text: text, username: currentUser?.username || 'Guest' };
      const encoder = new TextEncoder();
      const payload = encoder.encode(JSON.stringify(messageData));
      room.localParticipant.publishData(payload, DataPacket_Kind.RELIABLE)
        .then(() => console.log("Chat message sent"))
        .catch(e => console.error("Failed to send chat message", e));
    }
  }, [room, currentUser]);

  // --- Render Logic ---
  // More granular loading/error display
  if (isLoading) { // Still fetching initial stream details
    return <div className="flex h-screen items-center justify-center bg-black"><span className="loading loading-lg loading-dots text-white"></span><p className="ml-4 text-white">Loading Stream Details...</p></div>;
  }

  if (error) { // An error occurred during init or LiveKit connection
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-neutral-900 text-white p-4">
        <h2 className="text-2xl font-semibold text-red-500 mb-4">Stream Error</h2>
        <p className="mb-6 text-center">{error}</p>
        <button onClick={() => { setError(null); setIsLoading(true); livekitConnectionDetailsRef.current = null; /* Force re-init by changing streamId or navigating away and back */ navigate(0); }} className="btn btn-warning mr-2">Try Again</button>
        <button onClick={() => navigate('/')} className="btn btn-primary">Go to Homepage</button>
      </div>
    );
  }

  if (!streamDataFromAPI) { // Should be caught by isLoading or error, but as a fallback
    return <div className="flex h-screen items-center justify-center bg-black text-white">Stream data not available.</div>;
  }
  
  // At this point, streamDataFromAPI is available. We might still be connecting to LiveKit.
  const apiThumbnail = streamDataFromAPI.thumbnail_url || streamDataFromAPI.auctions?.[0]?.Product?.images?.[0]?.image_url;
  const streamHeaderData = {
    id: streamDataFromAPI.stream_id,
    title: streamDataFromAPI.title,
    host: streamDataFromAPI.User || { username: 'Streamer', avatarUrl: '', rating: 0 },
    viewerCount: room?.state === ConnectionState.Connected ? room.remoteParticipants.size + (isCurrentUserStreamer ? 1 : 0) : (streamDataFromAPI.viewer_count || 0),
    streamUrl: window.location.href,
  };
  const auctionProduct = streamDataFromAPI.currentAuctionProduct || streamDataFromAPI.auctions?.[0]?.Product;

  return (
    <div className="flex flex-col h-screen bg-neutral-900 text-white overflow-hidden">
      <StreamHeader streamData={streamHeaderData} />
      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden md:flex flex-col w-80 lg:w-96 bg-black border-r border-neutral-800 overflow-y-auto">
          <StreamProductList
            streamTitle={streamDataFromAPI.title}
            products={streamDataFromAPI.Products || []}
          />
        </aside>
        <main className="flex-1 flex flex-col bg-black relative overflow-hidden">
          {isConnectingToLiveKit && !mainParticipant && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-10">
                  <span className="loading loading-lg loading-ring text-white"></span>
                  <p className="ml-3 text-white">Connecting to live stream...</p>
              </div>
          )}
          <StreamVideoPlayer
            mainParticipant={mainParticipant}
            isLocalStreamer={isCurrentUserStreamer && mainParticipant === room?.localParticipant}
            isAudioMuted={isCurrentUserStreamer ? isLocalAudioMuted : isRemoteAudioMuted}
            onToggleAudioMute={isCurrentUserStreamer ? handleToggleLocalAudioMute : handleToggleRemoteAudioMute}
            // Pass thumbnail only if NOT connecting and no main participant yet, or if no main participant at all
            thumbnailUrl={(!isConnectingToLiveKit && !mainParticipant) ? apiThumbnail : undefined}
          />
         
          {auctionProduct && ( <StreamAuctionControls product={auctionProduct} /> )}
        </main>
        <aside className={`w-full fixed bottom-0 left-0 h-[45vh] bg-black border-t border-neutral-800 
                        md:static md:flex md:flex-col md:w-80 lg:w-96 md:h-full md:border-t-0 md:border-l md:translate-x-0 transition-transform duration-300 ease-in-out z-20
                        transform ${activeTab === 'chat-visible-mobile' ? 'translate-y-0' : 'translate-y-full'} md:translate-y-0`}
        >
          <StreamChat
            messages={chatMessages} activeTab={activeTab} onTabChange={setActiveTab}
            viewerCount={streamHeaderData.viewerCount} onSendMessage={sendChatMessageViaLiveKit}
          />
        </aside>
      </div>
      <div className="md:hidden fixed bottom-4 right-4 z-30 space-x-2">
          <button onClick={() => setActiveTab(prev => prev === 'chat-visible-mobile' ? 'chat' : 'chat-visible-mobile')}
              className="btn btn-neutral btn-circle shadow-lg">
              <FiMessageSquare size={20}/>
          </button>
      </div>
    </div>
  );
};

export default StreamPage;