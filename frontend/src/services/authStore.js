// src/store/authStore.js

import { create } from 'zustand';
import authService from '../services/authService'; // Import the API service functions

// Define the store structure using Zustand's create function
const useAuthStore = create((set, get) => ({
  // --- State Properties ---

  /** The authenticated user object, or null if not logged in. */
  user: null,
  /** Boolean flag indicating if a user is currently authenticated. */
  isAuthenticated: false,
  /** Boolean flag indicating if an authentication-related operation is in progress. */
  isLoading: true, // Start true to indicate initial user check is pending
  /** Stores the last authentication error message, or null if no error. */
  error: null,
  isUserPanelOpen: false,      // For the right-hand user panel
  isMobileMenuOpen: false,
  /** Boolean flag controlling the visibility of the authentication modal. */
  isAuthModalOpen: false,
  /** String indicating which view ('signup' or 'login') the modal should display. */
  authModalView: 'signup', // Default view when opening the modal

  // --- Actions (Functions to modify state) ---

  /** Clears any existing authentication error message. */
  clearError: () => set({ error: null }),

  /** Sets the view mode ('signup' or 'login') for the authentication modal and clears errors. */
  setAuthModalView: (view) => set({ authModalView: view, error: null }), // Clear error on view change

  /** Opens the authentication modal, optionally setting the initial view. */
  openAuthModal: (view = 'signup') => set({ isAuthModalOpen: true, authModalView: view, error: null }),

  /** Closes the authentication modal and clears errors. */
  closeAuthModal: () => set({ isAuthModalOpen: false, error: null }),

  /**
   * Attempts to load the current user by calling the backend /me endpoint.
   * This relies on the HttpOnly cookie being sent automatically by the browser.
   * Updates isAuthenticated and user state based on the result.
   * Typically called once when the application initializes.
   */
  loadUser: async () => {
    // Only attempt load if not already authenticated (optional optimization)
    if (get().isAuthenticated) {
        set({ isLoading: false });
        return;
    }
    set({ isLoading: true }); // Set loading true before the async call
    try {
      // Call the service function - Uses the name 'getCurrentUser' as originally written
      const userData = await authService.getCurrentUser(); // <--- Uses original name
      // If successful, update state: user object, authenticated flag, loading false
      set({ user: userData, isAuthenticated: true, isLoading: false, error: null });
      console.log("Store: User loaded via cookie:", userData);
    } catch (err) {
      // If an error occurs (likely 401/403), it means no valid cookie/session.
      // Update state: no user, not authenticated, loading false. Don't set an error message here.
      console.log("Store: Failed to load user via cookie (likely not logged in).");
      set({ user: null, isAuthenticated: false, isLoading: false, error: null });
    }
    // No finally block needed here as state is set in both try and catch
  },
  

  /**
   * Registers a new user using the authService.
   * Updates state upon successful registration and closes the modal.
   * Sets error state upon failure.
   * @param {object} userData - Registration data from the form.
   * @returns {Promise<{success: boolean, message?: string}>} - Indicates success/failure.
   */
  // Uses the original action name 'register'
  register: async (userData) => { // <--- Uses original name
    set({ isLoading: true, error: null }); // Start loading, clear previous errors
    try {
      // Call the registration service function - Uses the name 'register' as originally written
      const { user: registeredUser } = await authService.register(userData); // <--- Uses original name
      // On success: Update state with user, set authenticated, stop loading, close modal
      set({
        user: registeredUser,
        isAuthenticated: true,
        isLoading: false,
        isAuthModalOpen: false, // Close modal on success
        error: null, // Clear errors on success
      });
      console.log("Store: Registration successful.");
      return { success: true }; // Return success status to the component
    } catch (err) {
      // On failure: Extract error message, stop loading, set error state
      const errorMessage = err.message || 'Registration failed'; // Use message from thrown error
      set({ isLoading: false, error: errorMessage, isAuthenticated: false, user: null }); // Clear auth state on error
      console.error("Store: Registration failed:", errorMessage);
      return { success: false, message: errorMessage }; // Return failure status and message
    }
    // No finally block needed here
  },

  /**
   * Logs in a user using the authService.
   * Updates state upon successful login and closes the modal.
   * Sets error state upon failure.
   * @param {object} credentials - Login credentials from the form.
   * @returns {Promise<{success: boolean, message?: string}>} - Indicates success/failure.
   */
  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      // Call the login service function (name was already consistent)
      const { user: loggedInUser } = await authService.login(credentials); // Backend sets cookie
      // On success: Update state with user, set authenticated, stop loading, close modal
      set({
        user: loggedInUser,
        isAuthenticated: true,
        isLoading: false,
        isAuthModalOpen: false, // Close modal on success
        error: null, // Clear errors on success
      });
       console.log("Store: Login successful.");
       return { success: true };
    } catch (err) {
      // On failure: Extract error message, stop loading, set error state
      const errorMessage = err.message || 'Login failed';
      set({ isLoading: false, error: errorMessage, isAuthenticated: false, user: null }); // Clear auth state on error
      console.error("Store: Login failed:", errorMessage);
      return { success: false, message: errorMessage };
    }
  },
  toggleUserPanel: () => set((state) => ({ isUserPanelOpen: !state.isUserPanelOpen })),
  closeUserPanel: () => set({ isUserPanelOpen: false }),

  toggleMobileMenu: () => set((state) => ({ isMobileMenuOpen: !state.isMobileMenuOpen })),
  closeMobileMenu: () => set({ isMobileMenuOpen: false }),
  /**
   * Logs the user out by calling the authService logout function.
   * Clears the user and authentication state regardless of API call success/failure.
   */
  logout: async () => {
    // Set loading briefly (optional)
    set({ isLoading: true });
    try {
      // Call the service function (name was already consistent)
      await authService.logout();
      console.log("Store: Logout API call successful.");
    } catch (err) {
      // Log the error, but proceed with client-side cleanup anyway
      console.error("Store: Logout API call failed:", err);
    } finally {
      // ALWAYS clear the client-side state after attempting logout
      set({ user: null, isAuthenticated: false, isLoading: false, error: null, isAuthModalOpen: false }); // Also close modal
      console.log("Store: Client-side auth state cleared.");
      // Note: Navigation should typically happen in the component calling logout
    }
  },
}));

// --- Initial User Load ---
// Immediately attempt to load the user when the store module is first imported/evaluated.
useAuthStore.getState().loadUser();

export default useAuthStore; // Export the hook to use the store in components