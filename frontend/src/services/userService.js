// src/services/userService.js
import apiClient from './apiClient';

export const updateUserProfile = async (profileDataAsFormData) => {
  try {
    const response = await apiClient.put('/users/profile', profileDataAsFormData, {
      // Axios will set Content-Type to multipart/form-data automatically for FormData
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to update profile.');
  }
};

export const changeUserPassword = async (passwordData) => {
  try {
    const response = await apiClient.put('/users/change-password', passwordData);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to change password.');
  }
};
export const getDashboardSummaryData = async () => {
  try {
    const response = await apiClient.get('/users/dashboard-summary'); // Matches route /api/users/dashboard-summary
    return response.data;
  } catch (error) {
    console.error('Error fetching dashboard summary data:', error.response?.data || error.message);
    throw error.response?.data || { message: error.message || 'Failed to load dashboard data.' };
  }
};