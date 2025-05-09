import React from 'react';
import { Link } from 'react-router-dom';
import { FiAlertTriangle, FiHome } from 'react-icons/fi'; // Example icons

const NotFoundPage = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-var(--header-height,4rem)-var(--footer-height,0rem))] text-center p-6 bg-base-200">
      {/* You can adjust min-h based on your header/footer heights */}
      <FiAlertTriangle className="w-24 h-24 text-warning mb-6" />
      <h1 className="text-5xl font-bold text-base-content mb-3">404</h1>
      <h2 className="text-2xl font-semibold text-base-content/90 mb-4">Oops! Page Not Found.</h2>
      <p className="text-lg text-base-content/70 max-w-md mb-8">
        The page you are looking for might have been removed, had its name changed,
        or is temporarily unavailable.
      </p>
      <Link to="/" className="btn btn-primary btn-lg gap-2">
        <FiHome />
        Go to Homepage
      </Link>
      <p className="mt-10 text-xs text-base-content/50">
        If you believe this is an error, please contact support.
      </p>
    </div>
  );
};

export default NotFoundPage;