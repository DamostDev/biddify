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