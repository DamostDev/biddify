// backend/src/lib/AuctionTimerLogic.js
// This module will manage the setTimeout logic for auctions.

// We need to import the actual function that performs the auction ending logic.
// This creates a slight challenge as endAuctionLogic is in auction.controller.js which uses models.
// We'll use a setter function to inject the actual endAuctionLogic from the controller.

let doEndAuctionLogic; // This will be set by auction.controller.js

export const setEndAuctionFunction = (fn) => {
    doEndAuctionLogic = fn;
};

const activeAuctionTimers = new Map(); // auctionId -> timeoutId
const AUCTION_RESET_DURATION_MS = 30 * 1000; // 30 seconds

export const scheduleAuctionEnd = (auctionId) => {
    if (typeof doEndAuctionLogic !== 'function') {
        console.error("[AuctionTimerLogic] CRITICAL: End auction function (doEndAuctionLogic) is not set. Cannot schedule end.");
        return;
    }

    if (activeAuctionTimers.has(auctionId)) {
        clearTimeout(activeAuctionTimers.get(auctionId));
        console.log(`[AuctionTimerLogic] Cleared existing timer for auction ${auctionId}.`);
    }

    const duration = AUCTION_RESET_DURATION_MS;
    const timeoutId = setTimeout(async () => {
        console.log(`[AuctionTimerLogic] Timeout Executed: Triggering end logic for auction ${auctionId}.`);
        activeAuctionTimers.delete(auctionId); // Remove before calling to prevent race conditions
        await doEndAuctionLogic(auctionId); // Call the function that was set
    }, duration + 1000); // +1s buffer

    activeAuctionTimers.set(auctionId, timeoutId);
    console.log(`[AuctionTimerLogic] Timer set for auction ${auctionId}. Duration: ${duration}ms. TimeoutID: ${timeoutId}`);
};

export const clearAuctionTimer = (auctionId) => {
    if (activeAuctionTimers.has(auctionId)) {
        const timeoutId = activeAuctionTimers.get(auctionId);
        clearTimeout(timeoutId);
        activeAuctionTimers.delete(auctionId);
        console.log(`[AuctionTimerLogic] Cleared and removed timer for auction ${auctionId}. TimeoutID: ${timeoutId}`);
    } else {
        // console.log(`[AuctionTimerLogic] No active timer found to clear for auction ${auctionId}.`);
    }
};