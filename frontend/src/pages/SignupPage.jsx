// src/pages/SignupPage.jsx

import React from 'react';
import { Link } from 'react-router-dom';
import SignupForm from '../components/SignupForm'; // Adjust path if needed
import { FaUserPlus } from 'react-icons/fa'; // Example: Different icon for signup

const SignupPage = () => {
  return (
    // Main container: Full height, flex centered, subtle background
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-base-200 to-base-300 px-4 py-12">

      {/* Signup Card/Panel */}
      {/* Use slightly larger max-w for potentially more fields */}
      <div className="w-full max-w-lg space-y-8 rounded-xl bg-base-100 p-8 shadow-xl md:p-10">

        {/* 1. Header Section (Logo/Title) */}
        <div className="text-center">
          {/* Optional: Simple Icon Logo */}
          <div className="mb-4 inline-block rounded-full bg-primary p-3 text-primary-content">
            <FaUserPlus size={24} /> {/* Signup related icon */}
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-base-content">
            Create Your Account
          </h1>
          <p className="mt-2 text-sm text-base-content/70">
            Join Biddify today - it's free!
          </p>
        </div>

        {/* 2. Signup Form Component */}
        <SignupForm />

        {/* 3. Footer Section (Login Link) */}
        <div className="text-center">
          <p className="text-sm text-base-content/80">
            Already have an account?{' '}
            <Link
              to="/login" // Link to Login page
              className="link-primary link font-medium hover:text-primary-focus"
            >
              Sign in
            </Link>
          </p>
           {/* Optional: Terms/Policy Link - Important for signup */}
           <p className="mt-4 text-xs text-base-content/50">
             By creating an account, you agree to our <a href="#" className="link-hover">Terms</a> & <a href="#" className="link-hover">Policy</a>.
           </p>
        </div>

      </div> {/* End Signup Card */}
    </div> // End Main Container
  );
};

export default SignupPage;