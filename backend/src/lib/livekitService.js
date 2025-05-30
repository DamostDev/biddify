import { AccessToken } from 'livekit-server-sdk'; // Use import with ESM
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.LIVEKIT_API_KEY;
const apiSecret = process.env.LIVEKIT_API_SECRET;

if (!apiKey || !apiSecret) {
    console.error("🔴 LiveKit API Key or Secret not configured. Check your .env file.");
    // In a real app, you might throw an error or have a health check fail
}

/**
 * Generates a LiveKit access token.
 * @param {string} roomName - The name of the room to join.
 * @param {string} participantIdentity - A unique identity for the participant.
 * @param {string} participantName - Display name for the participant.
 * @param {boolean} canPublish - Whether the participant can publish tracks.
 * @param {boolean} canSubscribe - Whether the participant can subscribe to tracks.
 * @param {object} [metadata] - Optional participant metadata.
 * @returns {string} The generated JWT token.
 */
export const generateLiveKitToken = (
        roomName, 
        participantIdentity, 
        participantName, 
        canPublish = false, 
        canSubscribe = true,
        canPublishAV = false,     // For audio/video publishing
        canSubscribeAV = true,    // For audio/video subscribing
        canPublishData = true,// Specifically for data messages (like chat)
         metadata = {}) => {
        console.log(`[LiveKitService] generateLiveKitToken called with:
        roomName: ${roomName}
        participantIdentity: ${participantIdentity}
        participantName: ${participantName}
        canPublishAV: ${canPublishAV}
        canSubscribeAV: ${canSubscribeAV}
        canPublishData: ${canPublishData} // <-- CHECK THIS VALUE
        metadata: ${JSON.stringify(metadata)}`);
        
    if (!apiKey || !apiSecret) {
        // This check is crucial because new AccessToken will error without them
        console.error("🔴 LiveKit API Key or Secret is missing during token generation.");
        throw new Error("LiveKit API credentials are not set.");
    }
    const at = new AccessToken(apiKey, apiSecret, {
        identity: participantIdentity,
        name: participantName,
        metadata: JSON.stringify(metadata), // Metadata must be a string
    });
    at.addGrant({
        room: roomName,
        roomJoin: true,
        canPublish: canPublish,
        canSubscribe: canSubscribe,
        canPublishData: canPublishData, // Streamer can send data (e.g., active auction item)
        canUpdateOwnMetadata: true,
        hidden: false, // So participant shows in participant list
    });
    return at.toJwt();
};