// src/services/apiClient.js
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    // 'Content-Type': 'application/json', // Default, can be overridden for FormData
  },
  withCredentials: true,
});

apiClient.interceptors.response.use(
  response => response,
  error => {
    // console.error("API Error:", error.response || error.message); // General API error logging
    // You could add global error handling here, e.g., for 401s to trigger logout
    // if (error.response && error.response.status === 401) {
    //   if (!window.location.pathname.includes('/login')) { // Avoid logout loop
    //      console.log("Global 401, attempting logout");
    //      // import useAuthStore from '../stores/authStore'; // Careful with imports here
    //      // useAuthStore.getState().logout(); // This can be tricky due to module loading
    //      // window.location.href = '/login'; // Hard redirect
    //   }
    // }
    return Promise.reject(error);
  }
);

export default apiClient;