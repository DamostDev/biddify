// backend/src/lib/livekitDataService.js
import { RoomServiceClient, DataPacket_Kind } from 'livekit-server-sdk';
import dotenv from 'dotenv';

dotenv.config();

let roomServiceInstance = null;
const livekitControllerApiUrl = process.env.LIVEKIT_URL ? process.env.LIVEKIT_URL.replace(/^wss?:\/\//, 'https://') : null;

if (process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET && livekitControllerApiUrl) {
  try {
    roomServiceInstance = new RoomServiceClient(
      livekitControllerApiUrl,
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET
    );
    console.log('[LiveKitDataService Init] ✅ LiveKit RoomServiceClient initialized successfully.');
  } catch (e) {
    console.error('🔴 [LiveKitDataService Init] Error initializing RoomServiceClient:', e.message, e);
    roomServiceInstance = null;
  }
} else {
  console.warn('⚠️ [LiveKitDataService Init] RoomServiceClient NOT initialized. Prerequisites not met.');
  if (!livekitControllerApiUrl) console.warn('  - LIVEKIT_URL missing or invalid.');
  if (!process.env.LIVEKIT_API_KEY) console.warn('  - LIVEKIT_API_KEY missing.');
  if (!process.env.LIVEKIT_API_SECRET) console.warn('  - LIVEKIT_API_SECRET missing.');
}

export async function sendDataToLiveKitRoom(roomName, type, payloadData, senderIdentity = 'server-system') {
    if (!roomServiceInstance) {
        console.error('[LiveKitDataService SendMsg] RoomService not initialized. Cannot send message.');
        return;
    }
    if (!roomName) {
        console.error('[LiveKitDataService SendMsg] roomName missing for sendDataToLiveKitRoom.');
        return;
    }
    try {
        const dataToSend = { type, payload: payloadData, senderIdentity }; // Include senderIdentity for context
        const encodedPayload = new TextEncoder().encode(JSON.stringify(dataToSend));
        // Ensure you're sending to the correct topic if clients are subscribing to a specific topic
        await roomServiceInstance.sendData(roomName, encodedPayload, DataPacket_Kind.RELIABLE, { topic: "auction_updates" });
        console.log(`[LiveKitDataService SendMsg] Sent ${type} to room ${roomName} on topic 'auction_updates'.`);
    } catch (e) {
        console.error(`[LiveKitDataService SendMsg] Error sending ${type} to room ${roomName}:`, e);
    }
}

export const getRoomServiceClient = () => roomServiceInstance;