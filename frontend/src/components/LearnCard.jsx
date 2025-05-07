// src/components/dashboard/LearnCard.jsx
import React from 'react';
import { FiPlayCircle } from 'react-icons/fi'; // Example icon for video

const LearnCard = ({ title, description, imageUrl, video = false }) => {
  return (
    <div className="card rounded-lg bg-base-100 shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden">
      {/* Image part */}
      <figure className="relative h-40 sm:h-48 bg-neutral-focus">
        {imageUrl ? (
          <img src={imageUrl} alt={title} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-yellow-400 to-orange-500"></div> // Placeholder gradient
        )}
        {video && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <FiPlayCircle className="h-12 w-12 text-white/80" />
          </div>
        )}
      </figure>
      {/* Text content part */}
      <div className="card-body p-4 sm:p-5">
        <h2 className="card-title text-base sm:text-lg font-semibold leading-tight mb-1">{title}</h2>
        <p className="text-xs sm:text-sm text-base-content/70 line-clamp-3">{description}</p>
        {/* Optional: Action button
        <div className="card-actions justify-start mt-3">
          <button className="btn btn-primary btn-xs sm:btn-sm">Learn More</button>
        </div> */}
      </div>
    </div>
  );
};

export default LearnCard;