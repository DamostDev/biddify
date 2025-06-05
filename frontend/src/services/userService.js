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
export const followUser = async (userIdToFollow) => {
  try {
    const response = await apiClient.post(`/users/${userIdToFollow}/follow`);
    return response.data;
  } catch (error) {
    console.error('Error following user:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to follow user.');
  }
};

export const unfollowUser = async (userIdToUnfollow) => {
  try {
    const response = await apiClient.post(`/users/${userIdToUnfollow}/unfollow`);
    return response.data;
  } catch (error) {
    console.error('Error unfollowing user:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to unfollow user.');
  }
};

export const getFollowingStatus = async (userIdToCheck) => {
  try {
    // Assumes backend route is /api/users/:userId/is-following
    const response = await apiClient.get(`/users/${userIdToCheck}/is-following`);
    return response.data; // Expected: { isFollowing: true/false }
  } catch (error) {
    console.error('Error checking following status:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to check following status.');
  }
};