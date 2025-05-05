// src/components/SignupForm.jsx
import React, { useState } from 'react';
import useAuthStore from '/Users/mbp/Documents/biddify/frontend/src/services/authStore.js'; 

const SignupForm = () => {
  const [username, setUsername] = useState(''); // <-- Changed from fullName
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const register = useAuthStore((state) => state.register);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    // Pass username, email, password to the register function
    // This structure should match what your backend controller expects in req.body
    await register({ username, email, password }); // <-- Changed from fullName
  };

  return (
    // Removed the outer div, form itself handles structure
    <form onSubmit={handleSubmit} className="pt-4 space-y-3"> {/* Adjusted spacing */}

      {/* Removed SocialLogins */}

      {/* Username Input */}
      <div className="form-control w-full">
        <input
          id="signup-username" // <-- Changed id
          type="text"
          placeholder="Username" // <-- Changed placeholder
          className="input input-bordered input-primary w-full focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" // <-- Consistent styling
          value={username} // <-- Changed value binding
          onChange={(e) => setUsername(e.target.value)} // <-- Changed state setter
          required // Keep required as it's likely mandatory
          disabled={isLoading}
        />
      </div>

      {/* Email Input (remains the same) */}
      <div className="form-control w-full">
        <input
          id="signup-email"
          type="email"
          placeholder="Email Address"
          className="input input-bordered input-primary w-full focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isLoading}
        />
      </div>

      {/* Password Input (remains the same) */}
      <div className="form-control w-full">
        <input
          id="signup-password"
          type="password"
          placeholder="Create Password"
          className="input input-bordered input-primary w-full focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6} // Or your backend requirement
          disabled={isLoading}
        />
      </div>

      {/* Country Select Placeholder (remains the same, optional) */}
      <div className="form-control w-full">
         <select className="select select-bordered select-primary w-full font-normal" defaultValue="United Kingdom" disabled={isLoading}>
            <option>🇬🇧 United Kingdom</option> <option>🇺🇸 United States</option>
            {/* Add more relevant options */}
         </select>
      </div>

      {/* Terms Text (remains the same) */}
      <p className="text-xs text-base-content/70 !mt-3 text-center px-4"> By continuing, you agree to our <a href="#" className="link link-primary font-medium">Terms</a> and <a href="#" className="link link-primary font-medium">Policy</a>.</p>

      {/* Error Display (remains the same) */}
      {error && <div className="alert alert-error text-xs p-2 !mt-3"> <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-4 w-4" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> <span>{error}</span> </div>}

      {/* Submit Button (remains the same) */}
      <button type="submit" className={`btn btn-accent w-full !mt-5 rounded-md normal-case text-accent-content ${isLoading ? 'loading' : ''}`} disabled={isLoading}> {isLoading ? <span className="loading loading-spinner loading-sm"></span> : 'Create Account'} </button>
    </form>
  );
};

export default SignupForm;