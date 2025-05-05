// src/services/authService.js
import axios from 'axios';

// Configure Axios instance
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api/auth';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Crucial for HttpOnly cookies
});

// --- Internal function names match backend endpoints/actions ---

/**
 * Handles user signup request. (Internally named signup)
 * @param {object} userData - User data { username, email, password }.
 * @returns {Promise<object>} - Resolves with { message, user } on success.
 * @throws {Error} - Rejects with an error message on failure.
 */
const signup = async (userData) => {
  try {
    const { username, email, password } = userData;
    if (!username || !email || !password) {
        throw new Error("Username, email, and password are required for signup.");
    }
    // Calls the backend /signup endpoint
    const response = await apiClient.post('/signup', { username, email, password });
    return response.data;
  } catch (error) {
    console.error('Signup Service Error:', error);
    const message = error.response?.data?.message || error.message || 'Signup failed. Please try again.';
    throw new Error(message);
  }
};

/**
 * Handles user login request.
 * @param {object} credentials - User credentials { email, password }.
 * @returns {Promise<object>} - Resolves with { message, user } on success.
 * @throws {Error} - Rejects with an error message on failure.
 */
const login = async (credentials) => {
  try {
    const { email, password } = credentials;
     if (!email || !password) {
        throw new Error("Email and password are required for login.");
    }
    // Calls the backend /login endpoint
    const response = await apiClient.post('/login', { email, password });
    return response.data;
  } catch (error) {
    console.error('Login Service Error:', error);
    const message = error.response?.data?.message || error.message || 'Login failed. Please check your credentials.';
     if (error.response?.status === 401) {
        throw new Error('Invalid credentials');
    }
    throw new Error(message);
  }
};

/**
 * Fetches the currently authenticated user's data. (Internally named getMe)
 * Relies on the HttpOnly cookie being sent automatically by the browser.
 * @returns {Promise<object>} - Resolves with the user object on success.
 * @throws {Error} - Rejects with an error message on failure (e.g., not logged in, token expired).
 */
const getMe = async () => {
  try {
     // Calls the backend /me endpoint
    const response = await apiClient.get('/me');
    return response.data;
  } catch (error) {
    console.error('GetMe Service Error:', error);
    if (error.response?.status === 401) {
        throw new Error('Not authenticated');
    }
    const message = error.response?.data?.message || error.message || 'Failed to fetch user data.';
    throw new Error(message);
  }
};

/**
 * Handles user logout request.
 * @returns {Promise<object>} - Resolves with { message } on success.
 * @throws {Error} - Rejects with an error message on failure.
 */
const logout = async () => {
  try {
    // Calls the backend /logout endpoint
    const response = await apiClient.post('/logout');
    return response.data;
  } catch (error) {
    console.error('Logout Service Error:', error);
    const message = error.response?.data?.message || error.message || 'Logout failed. Please try again.';
    throw new Error(message);
  }
};

// --- Exported object uses the names expected by the original authStore ---
const authService = {
  // The store calls 'register', so we map 'register' to our internal 'signup' function
  register: signup,
  // Login name was consistent
  login: login,
  // The store calls 'getCurrentUser', so we map 'getCurrentUser' to our internal 'getMe' function
  getCurrentUser: getMe,
  // Logout name was consistent
  logout: logout,
};

export default authService;