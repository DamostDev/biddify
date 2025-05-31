// frontend/src/services/chatService.js
import apiClient from './apiClient';

const chatService = {
  saveChatMessage: async (streamId, messagePayload) => {
    try {
      // messagePayload should be like { text: "Hello", client_timestamp: "ISO_STRING" }
      const response = await apiClient.post(`/streams/${streamId}/messages`, messagePayload);
      return response.data; // The saved message from backend (with DB ID)
    } catch (error) {
      console.error('Error saving chat message:', error.response?.data || error.message);
      throw error.response?.data || error;
    }
  },

  getChatMessages: async (streamId, beforeMessageId = null) => {
    try {
      let url = `/streams/${streamId}/messages?limit=50`;
      if (beforeMessageId) {
        url += `&before_message_id=${beforeMessageId}`;
      }
      const response = await apiClient.get(url);
      return response.data; // Array of messages
    } catch (error) {
      console.error('Error fetching chat messages:', error.response?.data || error.message);
      throw error.response?.data || error;
    }
  },
};

export default chatService;