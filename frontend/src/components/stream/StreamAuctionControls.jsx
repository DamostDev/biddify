// frontend/src/components/stream/StreamAuctionControls.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FiChevronUp, FiChevronDown, FiDollarSign, FiCreditCard, FiShare2, FiZap, FiCheckCircle, FiXCircle, FiSlash } from 'react-icons/fi'; // Added icons

const StreamAuctionControls = ({ auctionData, onPlaceBid, currentUserId, isStreamer, isLoadingBid }) => { // Added isLoadingBid
  const [bidAmount, setBidAmount] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const timerIntervalRef = useRef(null);

  const formatTime = useCallback((seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }, []);

  useEffect(() => {
    // Ensure auctionData exists and has necessary properties before proceeding
    if (auctionData && auctionData.status === 'active' && auctionData.end_time && auctionData.Product) {
      const endTimeMs = new Date(auctionData.end_time).getTime();
      const updateTimer = () => {
        const nowMs = Date.now();
        const remainingMs = endTimeMs - nowMs;
        if (remainingMs <= 0) {
          setTimeLeft(0);
          clearInterval(timerIntervalRef.current);
        } else {
          setTimeLeft(Math.max(0, Math.ceil(remainingMs / 1000)));
        }
      };
      clearInterval(timerIntervalRef.current);
      updateTimer();
      timerIntervalRef.current = setInterval(updateTimer, 1000);

      const currentAuctionPrice = parseFloat(auctionData.current_price || auctionData.starting_price || 0);
      // Only suggest next bid if not loading a bid and current price is valid
      if (!isLoadingBid && !isNaN(currentAuctionPrice)) {
        setBidAmount((currentAuctionPrice + 1).toFixed(2));
      }

    } else {
      setTimeLeft(0);
      clearInterval(timerIntervalRef.current);
      if (auctionData && auctionData.Product && auctionData.status !== 'active') {
          const finalPrice = parseFloat(auctionData.current_price || auctionData.starting_price || 0);
          if(!isNaN(finalPrice)) setBidAmount(finalPrice.toFixed(2));
      } else if (!auctionData || !auctionData.Product) {
          setBidAmount(''); // Clear bid amount if no valid auction/product
      }
    }
    return () => clearInterval(timerIntervalRef.current);
  }, [auctionData, isLoadingBid]);

  if (!auctionData || !auctionData.Product) {
    console.log("[StreamAuctionControls] Rendering 'No active auction.' because auctionData or auctionData.Product is null/undefined.", auctionData);
    return (
        <div className="bg-neutral-900 p-3 sm:p-4 border-t border-neutral-800 text-neutral-500 text-sm text-center">
          No active auction.
        </div>
    );
  }

  console.log("[StreamAuctionControls] Rendering with auctionData:", JSON.stringify(auctionData, null, 2));


  const { Product: product, current_price, starting_price, bid_count, winner, status } = auctionData;
  const highestBidderUsername = auctionData.winner?.username; // Use optional chaining for winner

  const displayPrice = parseFloat(current_price || starting_price || 0).toFixed(2);
  const isAuctionEnded = status === 'sold' || status === 'unsold' || status === 'cancelled';
  const canBid = status === 'active' && !isStreamer && product && (!currentUserId || product.user_id !== currentUserId);


  const handleBidInputChange = (e) => setBidAmount(e.target.value);

  const handleQuickBid = (increment) => {
    if (!canBid || isLoadingBid) return;
    const currentDisplayPrice = parseFloat(displayPrice);
    if (isNaN(currentDisplayPrice)) return;
    const newBid = currentDisplayPrice + increment;
    setBidAmount(newBid.toFixed(2));
  };

  const submitBid = () => {
    if (!canBid || isLoadingBid || !bidAmount || isNaN(parseFloat(bidAmount))) return;
    const bidValue = parseFloat(bidAmount);
    const currentDisplayPrice = parseFloat(displayPrice);
    if (isNaN(currentDisplayPrice) || bidValue <= currentDisplayPrice) {
        console.warn("Bid must be higher than current price.", {bidValue, currentDisplayPrice});
        // TODO: Show user-facing error
        return;
    }
    console.log(`[StreamAuctionControls] Submitting bid for auction ${auctionData.auction_id}, amount ${bidValue}`);
    onPlaceBid(auctionData.auction_id, bidValue);
  };

  const winnerDetails = auctionData.winner;

  return (
      <div className="bg-neutral-900 p-3 sm:p-4 border-t border-neutral-800 shrink-0 text-white">
      {/* Product Info */}
      <div className="flex gap-3 mb-2.5">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-md bg-neutral-800 overflow-hidden shrink-0">
          <img src={product.images?.find(img => img.is_primary)?.image_url || product.images?.[0]?.image_url || 'https://via.placeholder.com/80'} alt={product.title} className="w-full h-full object-cover" />
        </div>
        <div className="flex-grow min-w-0">
          <p className="text-xs text-neutral-400 mb-0.5">
            {bid_count || 0} Bids
            <span onClick={() => setShowDetails(!showDetails)} className="ml-2 text-yellow-400 cursor-pointer hover:underline text-xs inline-flex items-center">
                See {showDetails ? 'Less' : 'More'} {showDetails ? <FiChevronUp size={12} className="ml-0.5"/> : <FiChevronDown size={12} className="ml-0.5"/>}
            </span>
          </p>
          <h3 className="font-semibold text-sm sm:text-base leading-tight line-clamp-2 mb-0.5">{product.title}</h3>
          {showDetails && (
            <>
              <p className="text-xs text-neutral-400 line-clamp-2">{product.condition}</p>
            </>
          )}
        </div>
        <div className="flex flex-col items-center space-y-2 shrink-0 ml-2">
            <button className="btn btn-xs btn-ghost text-neutral-400 flex flex-col h-auto p-1 leading-none">
                <FiShare2 size={16}/> <span className="text-[10px] mt-0.5">Share</span>
            </button>
             <button className="btn btn-xs btn-ghost text-neutral-400 flex flex-col h-auto p-1 leading-none">
                <FiCreditCard size={16}/> <span className="text-[10px] mt-0.5">Wallet</span>
            </button>
        </div>
      </div>

      {/* Bidding Section OR End Status */}
      {status === 'active' && (
        <>
          <div className="flex items-end gap-2 sm:gap-3">
            <div className="flex-grow">
              <label htmlFor={`custom-bid-${auctionData.auction_id}`} className="text-xs text-neutral-400 block mb-0.5">
                Your Bid (Min: ${(parseFloat(displayPrice) + 0.01).toFixed(2)})
              </label>
              <input
                type="number" id={`custom-bid-${auctionData.auction_id}`} value={bidAmount} onChange={handleBidInputChange}
                min={(parseFloat(displayPrice) + 0.01).toFixed(2)} step="0.01"
                className="input input-sm w-full bg-neutral-800 border-neutral-700 rounded-lg focus:border-yellow-500 placeholder-neutral-500"
                placeholder="Enter amount" disabled={!canBid || isLoadingBid}
              />
              <div className="mt-1.5 flex gap-1.5">
                <button onClick={() => handleQuickBid(1)} className="btn btn-xs btn-outline border-neutral-700 text-neutral-400 hover:bg-neutral-700" disabled={!canBid || isLoadingBid}>+ $1</button>
                <button onClick={() => handleQuickBid(5)} className="btn btn-xs btn-outline border-neutral-700 text-neutral-400 hover:bg-neutral-700" disabled={!canBid || isLoadingBid}>+ $5</button>
                <button onClick={() => handleQuickBid(10)} className="btn btn-xs btn-outline border-neutral-700 text-neutral-400 hover:bg-neutral-700" disabled={!canBid || isLoadingBid}>+ $10</button>
              </div>
            </div>
            <button
              onClick={submitBid}
              className="btn btn-md bg-yellow-400 hover:bg-yellow-500 border-yellow-400 text-black font-bold normal-case px-4 sm:px-6"
              disabled={!canBid || isLoadingBid || parseFloat(bidAmount) <= parseFloat(displayPrice)}
            >
              {isLoadingBid ? <span className="loading loading-spinner loading-xs"></span> : <FiZap size={16} className="mr-1"/>}
              Bid: ${bidAmount || '0'}
            </button>
            <div className="text-center shrink-0 w-16">
              <p className="text-lg sm:text-xl font-bold text-green-400 leading-none">${displayPrice}</p>
              <p className={`text-sm font-semibold leading-none ${timeLeft <= 10 && timeLeft > 0 ? 'text-red-500 animate-pulse' : 'text-neutral-300'}`}>
                {formatTime(timeLeft)}
              </p>
            </div>
          </div>
          {auctionData.winner_id && (
            <p className="text-xs text-center mt-2">
              {auctionData.winner_id === currentUserId
                ? <span className="text-green-400 font-semibold flex items-center justify-center gap-1"><FiCheckCircle/> You are winning!</span>
                : <span className="text-yellow-500">{winnerDetails?.username || 'Someone'} is winning!</span>
              }
            </p>
          )}
        </>
      )}

      {isAuctionEnded && (
        <div className="text-center py-3 px-2 rounded-lg mt-2
                        bg-opacity-20 border
                        ${status === 'sold' ? 'bg-green-500 border-green-500 text-green-300' :
                          status === 'unsold' ? 'bg-orange-500 border-orange-500 text-orange-300' :
                          'bg-neutral-700 border-neutral-600 text-neutral-400'}"
        >
          {status === 'sold' && winnerDetails && (
            <p className="font-semibold text-sm flex items-center justify-center gap-2">
                <FiCheckCircle size={18}/> SOLD to {winnerDetails.username} for ${parseFloat(current_price).toFixed(2)}!
            </p>
          )}
          {status === 'unsold' && (
            <p className="font-semibold text-sm flex items-center justify-center gap-2">
                <FiXCircle size={18}/> Auction ended. Product Unsold.
            </p>
          )}
          {status === 'cancelled' && (
            <p className="font-semibold text-sm flex items-center justify-center gap-2">
                <FiSlash size={18}/> Auction Cancelled.
            </p>
          )}
        </div>
      )}
      {status === 'pending' && (
        <div className="text-center py-3 text-blue-400 font-semibold animate-pulse">Auction starting soon...</div>
      )}
    </div>
  );
};
export default StreamAuctionControls;