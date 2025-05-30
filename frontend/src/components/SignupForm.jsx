// src/components/SignupForm.jsx

import React, { useState } from 'react';
import useAuthStore from '../services/authStore.js'; // Adjust path if needed
import { shallow } from 'zustand/shallow';
// Import icons if needed for password or other fields
// import { FiEye, FiEyeOff } from 'react-icons/fi';

const SignupForm = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // const [showPassword, setShowPassword] = useState(false); // Add if using password toggle

  const register = useAuthStore((state) => state.register);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (error) clearError();
    // Ensure data structure matches backend/store expectation
    await register({ username, email, password });
    // Handle result (e.g., redirect) in parent or via store listener
  };

  return (
    // Use consistent spacing
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Username Field */}
      <div>
        <label
          htmlFor="signup-username"
          className="label pb-1 pt-0 text-sm font-medium text-base-content/80"
        >
          Username
        </label>
        <input
          id="signup-username"
          type="text"
          placeholder="Choose a username"
          className="input input-bordered w-full focus:border-primary-focus focus:outline-none focus:ring-1 focus:ring-primary"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          disabled={isLoading}
        />
      </div>

      {/* Email Field */}
      <div>
        <label
          htmlFor="signup-email"
          className="label pb-1 pt-0 text-sm font-medium text-base-content/80"
        >
          Email Address
        </label>
        <input
          id="signup-email"
          type="email"
          placeholder="you@example.com"
          className="input input-bordered w-full focus:border-primary-focus focus:outline-none focus:ring-1 focus:ring-primary"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isLoading}
        />
      </div>

      {/* Password Field */}
      <div>
        <label
          htmlFor="signup-password"
          className="label pb-1 pt-0 text-sm font-medium text-base-content/80"
        >
          Password
        </label>
        {/* Optional: Add password visibility toggle similar to LoginForm if desired */}
        <input
          id="signup-password"
          type="password" // Keep as password
          placeholder="Create a strong password"
          className="input input-bordered w-full focus:border-primary-focus focus:outline-none focus:ring-1 focus:ring-primary"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8} // Example requirement
          disabled={isLoading}
        />
         {/* Optional: Password requirement hints */}
         <p className="mt-2 text-xs text-base-content/60">
            Must be at least 8 characters long.
         </p>
      </div>

       {/* Terms Checkbox */}
       <div className="form-control pt-2"> {/* Add some top padding */}
          <label className="label cursor-pointer justify-start gap-3">
            <input
              type="checkbox"
              required
              className="checkbox checkbox-primary checkbox-sm" // Use theme color
              disabled={isLoading}
            />
            <span className="label-text text-sm text-base-content/80">
              I agree to the <a href="#" className="link link-hover">Terms of Service</a>
            </span>
          </label>
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
      <div> {/* Wrap button */}
        <button
          type="submit"
          className="btn btn-primary w-full normal-case text-base" // Consistent button style
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <span className="loading loading-spinner loading-sm"></span>
              <span className="ml-2">Creating Account...</span>
            </>
          ) : (
            'Create Account'
          )}
        </button>
      </div>
    </form>
  );
};

export default SignupForm;