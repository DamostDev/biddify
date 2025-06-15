// frontend/src/components/stream/ProductQuickViewModal.jsx
import React, { useState, useEffect } from 'react';
import { FiX, FiChevronLeft, FiChevronRight, FiZap } from 'react-icons/fi'; // Changed FiShoppingCart to FiZap for Buy Now

const ProductQuickViewModal = ({ product, isOpen, onClose, onBuyNow }) => { // Added onBuyNow prop
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    setCurrentImageIndex(0);
  }, [product, isOpen]);

  if (!isOpen || !product) {
    return null;
  }

  const productImages = product.images && Array.isArray(product.images) && product.images.length > 0 
    ? product.images 
    : [{ image_url: 'https://via.placeholder.com/600x600.png?text=No+Image', is_primary: true, alt_text: product.title || "Product Image" }];
  
  const sortedImages = [...productImages].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1;
    if (!a.is_primary && b.is_primary) return 1;
    return (a.image_id || 0) - (b.image_id || 0); 
  });

  const nextImage = () => {
    setCurrentImageIndex((prevIndex) => (prevIndex + 1) % sortedImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prevIndex) => (prevIndex - 1 + sortedImages.length) % sortedImages.length);
  };

  const handleDotClick = (index) => {
    setCurrentImageIndex(index);
  };

  const handleBuyNowClick = () => {
    if (onBuyNow) {
      onBuyNow(product); // Pass the product to the handler in StreamPage
    }
    // onClose(); // Decide if modal should close immediately or after buy now process starts
  };
  
  return (
    <div className={`modal modal-bottom sm:modal-middle ${isOpen ? 'modal-open' : ''}`}>
      <div className="modal-box bg-neutral-800 text-white w-11/12 max-w-2xl p-0 relative rounded-lg">
        <button
          onClick={onClose}
          className="btn btn-sm btn-circle btn-ghost absolute right-3 top-3 z-20 text-neutral-400 hover:bg-neutral-700 hover:text-white"
          aria-label="Close"
        >
          <FiX size={20} />
        </button>

        <div className="grid md:grid-cols-2 gap-0">
          <div className="relative bg-black aspect-square md:aspect-auto md:h-full flex items-center justify-center overflow-hidden md:rounded-l-lg">
            {sortedImages.length > 0 && (
              <img
                src={sortedImages[currentImageIndex].image_url}
                alt={sortedImages[currentImageIndex].alt_text || product.title}
                className="w-full h-full object-contain"
              />
            )}
            {sortedImages.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 btn btn-circle btn-sm bg-black/50 hover:bg-black/70 border-none text-white z-10"
                  aria-label="Previous image"
                >
                  <FiChevronLeft size={20} />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 btn btn-circle btn-sm bg-black/50 hover:bg-black/70 border-none text-white z-10"
                  aria-label="Next image"
                >
                  <FiChevronRight size={20} />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex space-x-1.5 z-10">
                    {sortedImages.map((_, index) => (
                        <button
                            key={`dot-${index}`}
                            onClick={() => handleDotClick(index)}
                            className={`w-2 h-2 rounded-full transition-all duration-150 ${index === currentImageIndex ? 'bg-white scale-125' : 'bg-white/50 hover:bg-white/75'}`}
                            aria-label={`Go to image ${index + 1}`}
                        />
                    ))}
                </div>
              </>
            )}
          </div>

          <div className="p-5 sm:p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-xl sm:text-2xl font-bold mb-1 leading-tight">{product.title}</h3>
              {product.condition && (
                <span className="badge badge-sm bg-neutral-700 border-neutral-600 text-neutral-300 mb-2 capitalize">
                  {product.condition.replace(/_/g, " ")}
                </span>
              )}
              <p className="text-2xl sm:text-3xl font-bold text-yellow-400 mb-3">
                ${parseFloat(product.original_price).toFixed(2)}
              </p>
              <div className="prose prose-sm prose-invert text-neutral-300 max-h-32 overflow-y-auto mb-4 custom-scrollbar">
                <p>{product.description || "No description available."}</p>
              </div>
            </div>

            <div className="mt-auto"> {/* Removed space-y-2.5 as there's only one button now */}
              <button 
                onClick={handleBuyNowClick}
                className="btn btn-primary btn-block normal-case text-base" // Kept primary style for main action
              >
                <FiZap className="mr-2" /> Buy Now
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  );
};

export default ProductQuickViewModal;