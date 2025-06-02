// src/services/auctionService.js
import apiClient from './apiClient';

const auctionService = {
  // Create a new auction (returns the pending auction object)
  createAuction: async (auctionData) => {
    // auctionData: { product_id, stream_id, starting_price, reserve_price (optional), duration_seconds }
    try {
      const response = await apiClient.post('/auctions', auctionData);
      return response.data;
    } catch (error) {
      console.error("Error creating auction:", error.response?.data || error.message);
      throw error.response?.data || error;
    }
  },

  // Start a pending auction (returns the activated auction object)
  startAuction: async (auctionId) => {
    try {
      const response = await apiClient.post(`/auctions/${auctionId}/start`);
      return response.data;
    } catch (error) {
      console.error("Error starting auction:", error.response?.data || error.message);
      throw error.response?.data || error;
    }
  },

  // Place a bid on an auction
  placeBid: async (auctionId, amount) => {
    try {
      const response = await apiClient.post('/bids', { auction_id: auctionId, amount });
      return response.data; // { message, bid, auction_current_price }
    } catch (error) {
      console.error("Error placing bid:", error.response?.data || error.message);
      throw error.response?.data || error;
    }
  },

  // Get details for a specific auction
  getAuctionDetails: async (auctionId) => {
    try {
      const response = await apiClient.get(`/auctions/${auctionId}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching auction details:", error.response?.data || error.message);
      throw error.response?.data || error;
    }
  },

  // Get all auctions with optional filters
  // Example: getAllAuctions({ streamId: '123', status: 'active' })
  getAllAuctions: async (params = {}) => {
    try {
        const response = await apiClient.get('/auctions', { params });
        return response.data;
    } catch (error) {
        console.error("Error fetching auctions:", error.response?.data || error.message);
        throw error.response?.data || error;
    }
  }
};

export default auctionService;