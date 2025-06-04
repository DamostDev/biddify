import apiClient from './apiClient'; // Your configured axios instance

const orderService = {
  getMyOrders: async (params = {}) => {
    try {
      const response = await apiClient.get('/orders/my-orders', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching my orders:', error.response?.data || error.message);
      throw error.response?.data || { message: error.message || 'Failed to fetch orders.' };
    }
  },

  getOrderById: async (orderId) => {
    try {
      const response = await apiClient.get(`/orders/${orderId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching order ${orderId}:`, error.response?.data || error.message);
      throw error.response?.data || { message: error.message || 'Failed to fetch order details.' };
    }
  },

  updateOrderStatus: async (orderId, status) => {
    try {
      const response = await apiClient.put(`/orders/${orderId}/status`, { status });
      return response.data;
    } catch (error) {
      console.error(`Error updating order status for ${orderId}:`, error.response?.data || error.message);
      throw error.response?.data || { message: error.message || 'Failed to update order status.' };
    }
  },
  // updateShippingAddress might be needed if you implement that feature in OrderDetailsModal
  updateShippingAddress: async (orderId, shippingAddress) => {
    try {
        const response = await apiClient.put(`/orders/${orderId}/shipping-address`, { shipping_address: shippingAddress });
        return response.data;
    } catch (error) {
        console.error(`Error updating shipping address for ${orderId}:`, error.response?.data || error.message);
        throw error.response?.data || { message: error.message || 'Failed to update shipping address.' };
    }
  }
};

export default orderService;