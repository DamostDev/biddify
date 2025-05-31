// src/services/streamService.js
import apiClient from './apiClient'; // my existing apiClient

const streamService = {
  getAllStreams: async (params = {}) => {
    try {
      const response = await apiClient.get('/streams', { params }); // Pass params for filtering (e.g., status=live)
      return response.data;
    } catch (error) {
      console.error('Error fetching all streams:', error);
      throw error.response?.data || error;
    }
  },

  getStreamDetails: async (streamId) => {
    try {
      const response = await apiClient.get(`/streams/${streamId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching stream details:', error);
      throw error.response?.data || error;
    }
  },

  goLiveStreamer: async (streamId) => {
    try {
      // This endpoint should return { token, livekitUrl, roomName, streamDetails, participantIdentity }
      const response = await apiClient.post(`/streams/${streamId}/go-live`);
      return response.data;
    } catch (error) {
      console.error('Error going live as streamer:', error);
      throw error.response?.data || error;
    }
  },

  joinLiveStreamViewer: async (streamId) => {
    try {
      // This endpoint should return { token, livekitUrl, roomName, streamDetails, participantIdentity }
      const response = await apiClient.get(`/streams/${streamId}/join-live`);
      return response.data;
    } catch (error) {
      console.error('Error joining live as viewer:', error);
      throw error.response?.data || error;
    }
  },
  getStreamDetails: async (streamId) => {
    try {
      const response = await apiClient.get(`/streams/${streamId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching stream details:', error);
      throw error.response?.data || error;
    }
  },

  goLiveStreamer: async (streamId) => {
    try {
      // This endpoint should return { token, livekitUrl, roomName, streamDetails, participantIdentity }
      const response = await apiClient.post(`/streams/${streamId}/go-live`);
      return response.data;
    } catch (error) {
      console.error('Error going live as streamer:', error);
      throw error.response?.data || error;
    }
  },

  joinLiveStreamViewer: async (streamId) => {
    try {
      // This endpoint should return { token, livekitUrl, roomName, streamDetails, participantIdentity }
      const response = await apiClient.get(`/streams/${streamId}/join-live`);
      return response.data;
    } catch (error) {
      console.error('Error joining live as viewer:', error);
      throw error.response?.data || error;
    }
  },

  // Optional: If you have an explicit backend call to end the LiveKit session & stream
  endLiveStream: async (streamId) => {
    try {
      const response = await apiClient.post(`/streams/${streamId}/end-live`);
      return response.data;
    } catch (error) {
      console.error('Error ending live stream:', error);
      throw error.response?.data || error;
    }
  },
};

export default streamService;