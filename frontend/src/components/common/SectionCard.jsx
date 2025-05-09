// src/components/common/SectionCard.jsx
import React, { useState } from 'react';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';

const SectionCard = ({ title, children, actions, initiallyOpen = true, description }) => {
    const [isOpen, setIsOpen] = useState(initiallyOpen);
    return (
        <div className="bg-base-100 rounded-lg shadow-md">
            {/* Changed from <button> to <div>, added role and tabIndex for accessibility */}
            <div
                role="button" // Makes it behave like a button for screen readers
                tabIndex={0}  // Makes it focusable
                className="flex justify-between items-center w-full p-4 sm:p-5 text-left hover:bg-base-200/30 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded-t-lg" // Added cursor-pointer and focus styles
                onClick={() => setIsOpen(!isOpen)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsOpen(!isOpen); }} // Allow keyboard interaction
                aria-expanded={isOpen}
                aria-controls={`section-content-${title.replace(/\s+/g, '-').toLowerCase()}`} // For accessibility
            >
                <div className="flex-grow">
                    <h2 className="text-md sm:text-lg font-semibold text-base-content">{title}</h2>
                    {description && <p className="text-xs text-base-content/60 mt-0.5">{description}</p>}
                </div>
                {/* 'actions' can now safely contain buttons */}
                <div className="flex items-center gap-2 ml-2 shrink-0"> {/* Added shrink-0 to prevent actions from growing too much */}
                    {actions}
                    <span className="p-1 rounded-full hover:bg-base-content/10">
                        {isOpen ? <FiChevronUp className="w-5 h-5 text-base-content/70" /> : <FiChevronDown className="w-5 h-5 text-base-content/70" />}
                    </span>
                </div>
            </div>
            <div
                id={`section-content-${title.replace(/\s+/g, '-').toLowerCase()}`} // For aria-controls
                className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}
            >
                {isOpen && (
                    <div className={`p-4 sm:p-5 space-y-4 ${isOpen ? 'border-t border-base-300' : ''}`}>
                        {children}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SectionCard;