// src/pages/LoginPage.jsx

import React from 'react';
import { Link } from 'react-router-dom';
import LoginForm from '../components/LoginForm'; // Make sure this path is correct
import { FaGavel } from 'react-icons/fa'; // Example Icon

const LoginPage = () => {
  return (
    // Main container: Full height, flex centered, subtle background
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-base-200 to-base-300 px-4 py-12">

      {/* Login Card/Panel */}
      <div className="w-full max-w-md space-y-8 rounded-xl bg-base-100 p-8 shadow-xl md:p-10">

        {/* 1. Header Section (Logo/Title) */}
        <div className="text-center">
          {/* Optional: Simple Icon Logo */}
          <div className="mb-4 inline-block rounded-full bg-primary p-3 text-primary-content">
            <FaGavel size={24} />
            {/* Or use your text logo: <span className="text-2xl font-bold">BIDDIFY</span> */}
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-base-content">
            Welcome Back!
          </h1>
          <p className="mt-2 text-sm text-base-content/70">
            Sign in to access your Biddify account.
          </p>
        </div>

        {/* 2. Login Form Component */}
        {/* This component is defined in the separate LoginForm.jsx file */}
        <LoginForm />

        {/* 3. Footer Section (Sign up Link) */}
        <div className="text-center">
          <p className="text-sm text-base-content/80">
            Don't have an account?{' '}
            <Link
              to="/signup" // Ensure this route exists in your App router
              className="link-primary link font-medium hover:text-primary-focus"
            >
              Sign up here
            </Link>
          </p>
          {/* Optional: Terms/Policy Link */}
           <p className="mt-4 text-xs text-base-content/50">
             By signing in, you agree to our <a href="#" className="link-hover">Terms</a> & <a href="#" className="link-hover">Policy</a>.
           </p>
        </div>

      </div> {/* End Login Card */}
    </div> // End Main Container
  );
};

export default LoginPage;