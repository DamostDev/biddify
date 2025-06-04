// frontend/src/services/streamService.js
import apiClient from './apiClient'; // your existing apiClient

const streamService = {
  getAllStreams: async (params = {}) => {
    try {
      const response = await apiClient.get('/streams', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching all streams:', error.response?.data || error.message);
      throw error.response?.data || { message: error.message || 'Failed to fetch streams' };
    }
  },

  getStreamDetails: async (streamId) => {
    try {
      const response = await apiClient.get(`/streams/${streamId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching stream details:', error.response?.data || error.message);
      throw error.response?.data || { message: error.message || 'Failed to fetch stream details' };
    }
  },

  // --- ADD THIS FUNCTION ---
  getMyStreams: async () => {
    try {
      const response = await apiClient.get('/streams/me'); // Backend route GET /api/streams/me
      return response.data;
    } catch (error) {
      console.error('Error fetching my streams:', error.response?.data || error.message);
      throw error.response?.data || { message: error.message || 'Failed to load your streams' };
    }
  },
  // --- END ADDED FUNCTION ---

  goLiveStreamer: async (streamId) => {
    try {
      const response = await apiClient.post(`/streams/${streamId}/go-live`);
      return response.data;
    } catch (error) {
      console.error('Error going live as streamer:', error.response?.data || error.message);
      throw error.response?.data || { message: error.message || 'Failed to start live stream' };
    }
  },

  joinLiveStreamViewer: async (streamId) => {
    try {
      const response = await apiClient.get(`/streams/${streamId}/join-live`);
      return response.data;
    } catch (error) {
      console.error('Error joining live as viewer:', error.response?.data || error.message);
      throw error.response?.data || { message: error.message || 'Failed to join live stream' };
    }
  },

  endLiveStream: async (streamId) => {
    try {
      const response = await apiClient.post(`/streams/${streamId}/end-live`);
      return response.data;
    } catch (error) {
      console.error('Error ending live stream:', error.response?.data || error.message);
      throw error.response?.data || { message: error.message || 'Failed to end live stream' };
    }
  },

  // If you need a frontend function to get products for a specific stream:
  getProductsForStream: async (streamId) => {
    try {
      // This assumes your backend has a route like GET /api/streams/:streamId/products
      const response = await apiClient.get(`/streams/${streamId}/products`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching products for stream ${streamId}:`, error.response?.data || error.message);
      throw error.response?.data || { message: error.message || `Failed to fetch products for stream ${streamId}` };
    }
  },

  // Add other frontend stream-related service calls here
  // e.g., createStream, updateStream, deleteStream

  createStream: async (streamData) => {
    try {
      const response = await apiClient.post('/streams', streamData, {
        headers: { 'Content-Type': 'multipart/form-data' }, // If sending files
      });
      return response.data;
    } catch (error) {
      console.error('Error creating stream:', error.response?.data || error.message);
      throw error.response?.data || { message: error.message || 'Failed to create stream' };
    }
  },

  updateStream: async (streamId, streamData) => {
    try {
      const response = await apiClient.put(`/streams/${streamId}`, streamData, {
        headers: { 'Content-Type': 'multipart/form-data' }, // If sending files
      });
      return response.data;
    } catch (error) {
      console.error(`Error updating stream ${streamId}:`, error.response?.data || error.message);
      throw error.response?.data || { message: error.message || 'Failed to update stream' };
    }
  },

  deleteStream: async (streamId) => {
    try {
      const response = await apiClient.delete(`/streams/${streamId}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting stream ${streamId}:`, error.response?.data || error.message);
      throw error.response?.data || { message: error.message || 'Failed to delete stream' };
    }
  },
};

export default streamService;
