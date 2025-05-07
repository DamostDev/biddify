import React, { useState } from 'react';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import useAuthStore from '/Users/mbp/Documents/biddify/frontend/src/services/authStore.js'; 
// No need to import shallow anymore for this component
// import { shallow } from 'zustand/shallow';
// import { useNavigate } from 'react-router-dom'; // Uncomment if you handle redirect here

const LoginForm = () => {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  // const navigate = useNavigate(); // Uncomment if you handle redirect here

  // --- Split Zustand Hook Calls ---
  // Select each piece of state individually
  const login = useAuthStore(state => state.login);
  const isLoading = useAuthStore(state => state.isLoading);
  const error = useAuthStore(state => state.error);
  const clearError = useAuthStore(state => state.clearError);
  // --- End Split Hook Calls ---

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Check if error exists *before* calling clearError (optional safety)
    if (error) {
        clearError();
    }
    const credentials = { email: emailOrUsername, password: password };
    const result = await login(credentials);

    // Handle navigation/feedback based on result
    if (result.success) {
         console.log("Login component received success");
         // navigate('/dashboard'); // Example redirect - uncomment if needed
    } else {
         console.log("Login component received failure:", result.message);
         // Error state is already set by the store, will be displayed
    }
  };

  return (
    // Use slightly larger spacing for a cleaner look
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Email/Username Field */}
      <div>
        <label
          htmlFor="login-email"
          className="label pb-1 pt-0 text-sm font-medium text-base-content/80"
        >
          Email or Username
        </label>
        <input
          id="login-email"
          type="text"
          placeholder="you@example.com"
          className="input input-bordered w-full focus:border-primary-focus focus:outline-none focus:ring-1 focus:ring-primary" // Subtle focus
          value={emailOrUsername}
          onChange={(e) => setEmailOrUsername(e.target.value)}
          required
          autoComplete="username" // Add autocomplete hint
          disabled={isLoading}
        />
      </div>

      {/* Password Field */}
      <div>
        <div className="flex items-center justify-between">
          <label
            htmlFor="login-password"
            className="label pb-1 pt-0 text-sm font-medium text-base-content/80"
          >
            Password
          </label>
          <a
            href="#" // TODO: Replace with actual password reset link/route
            className="link-secondary link-hover text-xs font-medium"
          >
            Forgot Password?
          </a>
        </div>
        <div className="relative">
          <input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            className="input input-bordered w-full pr-10 focus:border-primary-focus focus:outline-none focus:ring-1 focus:ring-primary" // Subtle focus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password" // Add autocomplete hint
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-base-content/50 hover:text-primary focus:outline-none"
            tabIndex={-1} // Avoids tabbing to this decorative button
            disabled={isLoading}
            aria-label={showPassword ? 'Hide password' : 'Show password'} // Accessibility
          >
            {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="alert alert-error text-sm p-3 shadow-md">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Submit Button */}
      <div> {/* Wrap button for consistent spacing from space-y-6 */}
        <button
          type="submit"
          // Use standard DaisyUI primary button, full width
          className="btn btn-primary w-full normal-case text-base"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <span className="loading loading-spinner loading-sm"></span>
              <span className="ml-2">Signing In...</span> {/* Keep text for context */}
            </>
          ) : (
            'Sign In'
          )}
        </button>
      </div>
    </form>
  );
};

export default LoginForm;