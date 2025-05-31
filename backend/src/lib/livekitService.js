// backend/src/lib/livekitService.js
import { AccessToken } from 'livekit-server-sdk';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.LIVEKIT_API_KEY;
const apiSecret = process.env.LIVEKIT_API_SECRET;

if (!apiKey || !apiSecret) {
    console.error("🔴 LiveKit API Key or Secret not configured. Check your .env file.");
}

/**
 * Generates a LiveKit access token.
 * @param {string} roomName - The name of the room to join.
 * @param {string} participantIdentity - A unique identity for the participant.
 * @param {string} participantName - Display name for the participant.
 * @param {boolean} canPublishSources - Whether the participant can publish audio/video tracks.
 * @param {boolean} canSubscribeToSources - Whether the participant can subscribe to audio/video tracks.
 * @param {boolean} canPublishData - Whether the participant can publish data messages (e.g., chat).
 * @param {object} [metadata] - Optional participant metadata.
 * @returns {string} The generated JWT token.
 */
export const generateLiveKitToken = (
        roomName,
        participantIdentity,
        participantName,
        canPublishSources = false,    // For publishing audio/video
        canSubscribeToSources = true, // For subscribing to audio/video
        canPublishData = true,      // For publishing data messages
        metadata = {}
    ) => {

    console.log(`[LiveKitService] Generating token with:
        Room: ${roomName}, Identity: ${participantIdentity}, Name: ${participantName}
        CanPublishSources (AV): ${canPublishSources}
        CanSubscribeToSources (AV): ${canSubscribeToSources}
        CanPublishData: ${canPublishData}
        Metadata: ${JSON.stringify(metadata)}`);

    if (!apiKey || !apiSecret) {
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
        canPublish: canPublishSources,        // Grant for publishing audio/video sources
        canSubscribe: canSubscribeToSources,  // Grant for subscribing to audio/video sources
                                              // Note: LiveKit's `canSubscribe` grant in general also covers data.
                                              // If you want fine-grained control for subscribing to data separately,
                                              // the SDK might not offer that directly in the grant.
                                              // Typically, if someone can join, they can subscribe to data.
        canPublishData: canPublishData,      // Grant for publishing data
        canUpdateOwnMetadata: true,
        hidden: false,
    });

    return at.toJwt();
};