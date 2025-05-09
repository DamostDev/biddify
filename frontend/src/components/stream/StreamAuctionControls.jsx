// src/components/stream/StreamAuctionControls.jsx
import React, { useState } from 'react';
import { FiChevronUp, FiChevronDown, FiDollarSign, FiCreditCard, FiShare2 } from 'react-icons/fi';

const StreamAuctionControls = ({ product }) => {
  const [showDetails, setShowDetails] = useState(false); // To toggle "See Less/More"
  const [bidAmount, setBidAmount] = useState(product.userBid || product.currentBid + 5); // Example increment

  const handleBidChange = (e) => {
    const value = parseInt(e.target.value);
    setBidAmount(isNaN(value) ? '' : value);
  };

  const placeBid = () => {
    console.log(`Placing bid of $${bidAmount} for ${product.name}`);
    // TODO: Implement actual bid placement logic
  };

  return (
    <div className="bg-neutral-900 p-3 sm:p-4 border-t border-neutral-800 shrink-0 text-white">
      {/* Product Info */}
      <div className="flex gap-3 mb-2.5">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-md bg-neutral-800 overflow-hidden shrink-0">
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
        </div>
        <div className="flex-grow min-w-0"> {/* min-w-0 for text truncation */}
          <p className="text-xs text-neutral-400 mb-0.5">
            {product.bids} Bids
            <span
                onClick={() => setShowDetails(!showDetails)}
                className="ml-2 text-yellow-400 cursor-pointer hover:underline text-xs inline-flex items-center"
            >
                See {showDetails ? 'Less' : 'More'} {showDetails ? <FiChevronUp size={12} className="ml-0.5"/> : <FiChevronDown size={12} className="ml-0.5"/>}
            </span>
          </p>
          <h3 className="font-semibold text-sm sm:text-base leading-tight line-clamp-2 mb-0.5">{product.name}</h3>
          {showDetails && (
            <>
              <p className="text-xs text-neutral-400 line-clamp-2">{product.condition}</p>
              <p className="text-xs text-red-400">{product.shippingInfo}</p>
            </>
          )}
        </div>
        {/* Action buttons on the right of product info */}
        <div className="flex flex-col items-center space-y-2 shrink-0 ml-2">
            <button className="btn btn-xs btn-ghost text-neutral-400 flex flex-col h-auto p-1 leading-none">
                <FiShare2 size={16}/> <span className="text-[10px] mt-0.5">Share</span>
            </button>
             <button className="btn btn-xs btn-ghost text-neutral-400 flex flex-col h-auto p-1 leading-none">
                <FiCreditCard size={16}/> <span className="text-[10px] mt-0.5">Wallet</span>
            </button>
        </div>
      </div>

      {/* Bidding Section */}
      <div className="flex items-end gap-2 sm:gap-3">
        <div className="flex-grow">
            <label htmlFor="custom-bid" className="text-xs text-neutral-400 block mb-0.5">Custom Bid</label>
            <input
                type="number"
                id="custom-bid"
                value={bidAmount}
                onChange={handleBidChange}
                className="input input-sm w-full bg-neutral-800 border-neutral-700 rounded-lg focus:border-yellow-500 placeholder-neutral-500"
                placeholder="Enter amount"
            />
        </div>
        <button onClick={placeBid} className="btn btn-md bg-yellow-400 hover:bg-yellow-500 border-yellow-400 text-black font-bold normal-case px-6 sm:px-8">
            Bid: ${bidAmount || '0'}
        </button>
        <div className="text-center shrink-0">
            <p className="text-lg sm:text-xl font-bold text-green-400 leading-none">${product.currentBid}</p>
            <p className="text-xs text-red-500 font-semibold leading-none">{product.timeLeft}</p>
        </div>
      </div>

        {/* "litke is winning!" type of message - this would come from WebSocket */}
        <p className="text-xs text-center text-green-400 mt-2">
            <span className="inline-flex items-center gap-1">
                <span className="avatar placeholder w-4 h-4 text-[9px]"><span className="bg-neutral-700 text-neutral-300 rounded-full">LI</span></span>
                litke <span className="font-semibold">is winning!</span>
            </span>
        </p>
    </div>
  );
};

export default StreamAuctionControls;