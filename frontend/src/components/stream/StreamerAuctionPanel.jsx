// src/components/stream/StreamerAuctionPanel.jsx
import React, { useState, useEffect } from 'react';
import { getLoggedInUserProducts } from '../../services/productService';
import auctionService from '../../services/auctionService'; // Corrected import
import { FiAlertCircle } from 'react-icons/fi';

const StreamerAuctionPanel = ({ currentStreamId, onAuctionAction, currentAuction }) => {
  const [myProducts, setMyProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [startingPrice, setStartingPrice] = useState('');
  const [reservePrice, setReservePrice] = useState(''); // Optional

  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isLoadingAction, setIsLoadingAction] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoadingProducts(true);
      setError(null);
      try {
        const prods = await getLoggedInUserProducts();
        // Filter for active products not currently in an active/pending auction (basic client-side filter)
        // A more robust solution would involve backend filtering or checking auction status of products.
        setMyProducts(prods.filter(p => p.is_active) || []);
      } catch (err) {
        setError("Couldn't load your products.");
        console.error("Error fetching products for auction panel:", err);
      } finally {
        setIsLoadingProducts(false);
      }
    };
    fetchProducts();
  }, []);

  /////////////////////////////
  useEffect(() => {
    console.log("[STREAMER AUCTION PANEL - PROP UPDATE] Received currentAuction:",
      currentAuction ? { id: currentAuction.auction_id, status: currentAuction.status, product_id: currentAuction.product_id } : null
    );
    // If the auction has truly ended, you might want to reset local form state here
    if (currentAuction && ['sold', 'unsold', 'cancelled'].includes(currentAuction.status)) {
        // Resetting fields when auction ends is good practice
        setSelectedProductId('');
        setStartingPrice('');
        setReservePrice('');
        setError(null); // Clear any panel-specific errors
    }
  }, [currentAuction]);

  const handleStartAuction = async () => {
    if (!selectedProductId || !startingPrice || parseFloat(startingPrice) <= 0) {
      setError("Please select a product and enter a valid starting price.");
      return;
    }
    if (currentAuction && currentAuction.status === 'active') {
      setError("An auction is already active. Please end it before starting a new one.");
      return;
    }

    setIsLoadingAction(true);
    setError(null);
    try {
      const auctionPayload = {
        product_id: parseInt(selectedProductId),
        stream_id: parseInt(currentStreamId), // Ensure currentStreamId is passed as prop
        starting_price: parseFloat(startingPrice),
        duration_seconds: 30, // Initial duration for the first bid phase, backend resets on bids
      };
      if (reservePrice && parseFloat(reservePrice) > 0) {
        auctionPayload.reserve_price = parseFloat(reservePrice);
      }

      const createdAuction = await auctionService.createAuction(auctionPayload);
      // The `startAuction` controller now also returns the auction details
      const startedAuction = await auctionService.startAuction(createdAuction.auction_id);

      if (onAuctionAction) {
        // Send the full started auction object, which includes product details due to backend includes
        onAuctionAction({ type: 'AUCTION_STARTED', payload: startedAuction });
      }
      // Reset form fields
      setSelectedProductId('');
      setStartingPrice('');
      setReservePrice('');
    } catch (err) {
      setError(err.message || "Failed to start auction.");
      console.error("Error starting auction:", err);
    } finally {
      setIsLoadingAction(false);
    }
  };

  const selectedProductDetails = myProducts.find(p => p.product_id === parseInt(selectedProductId));

  if (isLoadingProducts) {
    return <div className="p-3 bg-neutral-800 text-center"><span className="loading loading-sm loading-dots"></span></div>;
  }

  return (
    <div className="p-3 bg-neutral-800 border-t md:border-t-0 md:border-l border-neutral-700 text-white text-sm space-y-3">
      <h4 className="font-semibold text-base text-neutral-200">Auction Control</h4>
      {error && (
        <div className="alert alert-error alert-sm p-2 text-xs">
          <FiAlertCircle />
          <span>{error}</span>
        </div>
      )}

      <div className="form-control">
        <label className="label py-1 pt-0"><span className="label-text text-neutral-300 text-xs">Product to Auction*</span></label>
        <select
          className="select select-xs select-bordered w-full bg-neutral-700 border-neutral-600 focus:border-primary focus:ring-primary"
          value={selectedProductId}
          onChange={(e) => setSelectedProductId(e.target.value)}
          disabled={isLoadingAction || (currentAuction && currentAuction.status === 'active')}
        >
          <option value="">Select Your Product...</option>
          {myProducts.map(p => <option key={p.product_id} value={p.product_id}>{p.title} (ID: {p.product_id})</option>)}
        </select>
      </div>

      {selectedProductDetails && (
        <div className="p-2 bg-neutral-700/50 rounded-md flex items-center gap-2 text-xs">
            <img
              src={selectedProductDetails.images?.find(img => img.is_primary)?.image_url || selectedProductDetails.images?.[0]?.image_url || 'https://via.placeholder.com/40'}
              alt={selectedProductDetails.title}
              className="w-8 h-8 rounded object-cover"
            />
            <p className="truncate">{selectedProductDetails.title}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div className="form-control">
          <label className="label py-1 pt-0"><span className="label-text text-neutral-300 text-xs">Starting Price ($)*</span></label>
          <input
            type="number" placeholder="e.g., 5.00" min="0.01" step="0.01"
            className="input input-xs input-bordered w-full bg-neutral-700 border-neutral-600 focus:border-primary focus:ring-primary"
            value={startingPrice}
            onChange={(e) => setStartingPrice(e.target.value)}
            disabled={isLoadingAction || (currentAuction && currentAuction.status === 'active')}
          />
        </div>
        <div className="form-control">
          <label className="label py-1 pt-0"><span className="label-text text-neutral-300 text-xs">Reserve Price ($)</span></label>
          <input
            type="number" placeholder="Optional" min="0.01" step="0.01"
            className="input input-xs input-bordered w-full bg-neutral-700 border-neutral-600 focus:border-primary focus:ring-primary"
            value={reservePrice}
            onChange={(e) => setReservePrice(e.target.value)}
            disabled={isLoadingAction || (currentAuction && currentAuction.status === 'active')}
          />
        </div>
      </div>

      <button
        className="btn btn-xs sm:btn-sm btn-primary w-full normal-case"
        onClick={handleStartAuction}
        disabled={isLoadingAction || !selectedProductId || !startingPrice || (currentAuction && currentAuction.status === 'active')}
      >
        {isLoadingAction ? <span className="loading loading-spinner loading-xs"></span> : "Start Auction"}
      </button>
      {currentAuction && currentAuction.status === 'active' && (
          <p className="text-yellow-400 text-xs text-center mt-1">An auction is currently active.</p>
      )}
      {currentAuction && (currentAuction.status === 'sold' || currentAuction.status === 'unsold' || currentAuction.status === 'cancelled') && (
            <p className="text-green-400 text-xs text-center mt-1">
                Previous auction: {currentAuction.Product?.title} - {currentAuction.status}. Ready for new auction.
            </p>
      )}
      {!currentAuction && (
            <p className="text-neutral-400 text-xs text-center mt-1">
                No auction active. Select a product to start.
            </p>
      )}
    </div>
  );
};

export default StreamerAuctionPanel;