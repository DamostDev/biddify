// backend/src/controllers/auction.controller.js
import { Auction, Product, Stream, User, Bid, Order, ProductImage, sequelize } from '../models/index.js'; // Added ProductImage
import { Op } from 'sequelize';
import { scheduleAuctionEnd, clearAuctionTimer, setEndAuctionFunction } from '../lib/AuctionTimerLogic.js';

const activeAuctionTimers = new Map(); // auctionId -> timeoutId
const AUCTION_RESET_DURATION_MS = 30 * 1000; // 30 seconds for reset

// Helper to fetch full auction details (used after updates)
const getFullAuctionDetails = async (auctionId, transaction = null) => {
    return await Auction.findByPk(auctionId, {
        include: [
            {
                model: Product,
                include: [
                    { model: User, as: 'Owner', attributes: ['user_id', 'username', 'profile_picture_url'] }, // Ensure alias matches if defined, or remove 'as'
                    { model: ProductImage, as: 'images', order: [['is_primary', 'DESC']] }
                ]
            },
            { model: Stream, attributes: ['stream_id', 'title'] },
            { model: User, as: 'winner', attributes: ['user_id', 'username'] },
            // Optional: include last few bids if needed in AUCTION_UPDATED
            { model: Bid, include: [{model: User, attributes:['user_id', 'username']}], order: [['bid_time', 'DESC']], limit: 3 }
        ],
        transaction
    });
};

const actualEndAuctionLogic = async (auctionId) => { // Removed models from params, they are in scope
    console.log(`[actualEndAuctionLogic] Attempting to end auction ${auctionId}`);
    const t = await sequelize.transaction();
    try {
        clearAuctionTimer(auctionId); // Clear timer from the service

        const auction = await Auction.findByPk(auctionId, {
            include: [{ model: Product, required: true }],
            transaction: t,
            lock: t.LOCK.UPDATE
        });

        if (!auction || auction.status !== 'active') {
            console.log(`[actualEndAuctionLogic] Auction ${auctionId} not found or not active. Status: ${auction ? auction.status : 'N/A'}`);
            await t.rollback();
            return;
        }

        const winningBid = await Bid.findOne({
            where: { auction_id: auctionId, is_cancelled: false },
            order: [['amount', 'DESC'], ['bid_time', 'ASC']],
            include: [{ model: User, attributes: ['user_id', 'username'] }],
            transaction: t
        });

        if (winningBid) {
            auction.winner_id = winningBid.user_id;
            if (auction.reserve_price && winningBid.amount < auction.reserve_price) {
                auction.status = 'unsold';
            } else {
                auction.status = 'sold';
                auction.current_price = winningBid.amount;
                winningBid.is_winning = true;
                await winningBid.save({ transaction: t });
                await Order.create({ /* ... */ }, { transaction: t });
            }
        } else {
            auction.status = 'unsold';
            auction.winner_id = null;
        }

        auction.end_time = new Date();
        await auction.save({ transaction: t });
        await t.commit();

        const finalAuctionDetails = await getFullAuctionDetails(auctionId);
        console.log(`[actualEndAuctionLogic] Auction ${auctionId} ended with status: ${finalAuctionDetails.status}. Winner: ${finalAuctionDetails.winner?.username || 'None'}`);
        // TODO: Emit WebSocket event: auctionEnded (finalAuctionDetails)

    } catch (error) {
        await t.rollback();
        console.error(`[actualEndAuctionLogic] Error for auction ${auctionId}:`, error);
    }
};


// @desc    Create a new auction (typically within a stream)
// @route   POST /api/auctions
// @access  Protected (Stream Owner or Product Owner if not in stream)
export const createAuction = async (req, res) => {
  const {
    product_id,
    stream_id,
    starting_price,
    reserve_price,
    duration_seconds = 30, // Default initial duration to 30s for this flow
  } = req.body;
  const user_id = req.user.user_id;

  if (!product_id || !starting_price) {
    return res.status(400).json({ message: 'Product ID and starting price are required' });
  }

  const t = await sequelize.transaction();
  try {
    const product = await Product.findByPk(product_id, { transaction: t });
    if (!product) {
      await t.rollback();
      return res.status(404).json({ message: 'Product not found' });
    }
    if (product.user_id !== user_id) {
      await t.rollback();
      return res.status(403).json({ message: 'You can only auction your own products' });
    }
    if (!product.is_active) {
        await t.rollback();
        return res.status(400).json({ message: 'Product is not active and cannot be auctioned' });
    }

    let stream = null;
    if (stream_id) {
      stream = await Stream.findByPk(stream_id, { transaction: t });
      if (!stream) {
        await t.rollback();
        return res.status(404).json({ message: 'Stream not found' });
      }
      if (stream.user_id !== user_id) {
        await t.rollback();
        return res.status(403).json({ message: 'You can only create auctions within your own streams' });
      }
      // Allow for 'scheduled' or 'live' streams for auction creation
      if (!['live', 'scheduled'].includes(stream.status)) {
        await t.rollback();
        return res.status(400).json({ message: 'Auctions can only be created for live or scheduled streams' });
      }
    }

    const existingAuction = await Auction.findOne({
        where: { product_id, status: { [Op.in]: ['pending', 'active'] } },
        transaction: t
    });
    if (existingAuction) {
        await t.rollback();
        return res.status(400).json({ message: 'This product is already in an active or pending auction.' });
    }

    const auction = await Auction.create({
      product_id,
      stream_id: stream_id || null,
      user_id: product.user_id,
      starting_price,
      current_price: starting_price,
      reserve_price: reserve_price || null,
      duration_seconds, // This is now the "reset" duration
      status: 'pending',
      bid_count: 0,
    }, { transaction: t });

    await t.commit();
    const newAuctionDetails = await getFullAuctionDetails(auction.auction_id);
    res.status(201).json(newAuctionDetails);
  } catch (error) {
    await t.rollback();
    console.error('Error creating auction:', error);
    res.status(500).json({ message: 'Server error creating auction' });
  }
};

// @desc    Start a pending auction
// @route   POST /api/auctions/:id/start
// @access  Protected (Stream Owner / Product Owner)
export const startAuction = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const auction = await Auction.findByPk(req.params.id, {
        include: [Product, Stream], transaction: t
    });
    // ... (validation and authorization) ...
    if (!auction) { await t.rollback(); return res.status(404).json({ message: 'Auction not found' }); }
    if (auction.Product.user_id !== req.user.user_id && (auction.Stream && auction.Stream.user_id !== req.user.user_id)) {
        await t.rollback(); return res.status(403).json({ message: 'Not authorized' });
    }
    if (auction.status !== 'pending') { await t.rollback(); return res.status(400).json({message: `Auction status is ${auction.status}`}); }


    auction.status = 'active';
    auction.start_time = new Date();
    // The timer service uses a fixed 30s duration internally for resets
    auction.end_time = new Date(auction.start_time.getTime() + 30000); // Set initial end_time
    await auction.save({ transaction: t });
    await t.commit();

    scheduleAuctionEnd(auction.auction_id); // Use the service

    console.log(`Auction ${auction.auction_id} started. Ends at: ${auction.end_time}. Timer scheduled via service.`);
    const startedAuctionDetails = await getFullAuctionDetails(auction.auction_id);
    res.status(200).json({ message: 'Auction started successfully', auction: startedAuctionDetails });
  } catch (error) {
    await t.rollback();
    console.error('Error starting auction:', error);
    res.status(500).json({ message: 'Server error starting auction' });
  }
};

// @desc    Place a new bid on an auction
// @route   POST /api/bids
// @access  Protected
export const placeBid = async (req, res) => {
  const { auction_id, amount } = req.body;
  const user_id = req.user.user_id;

  if (!auction_id || amount === undefined) {
    return res.status(400).json({ message: 'Auction ID and bid amount are required' });
  }
  const bidAmount = parseFloat(amount);
  if (isNaN(bidAmount) || bidAmount <= 0) {
      return res.status(400).json({ message: 'Invalid bid amount' });
  }

  const t = await sequelize.transaction();
  try {
    const auction = await Auction.findByPk(auction_id, {
        include: [ { model: Product } ],
        transaction: t,
        lock: t.LOCK.UPDATE
    });

    if (!auction) {
      await t.rollback();
      return res.status(404).json({ message: 'Auction not found' });
    }
    if (auction.Product.user_id === user_id) {
        await t.rollback();
        return res.status(403).json({ message: 'You cannot bid on your own auction.' });
    }
    if (auction.status !== 'active') {
      await t.rollback();
      return res.status(400).json({ message: `Auction is not active. Status: ${auction.status}` });
    }
    if (new Date() >= new Date(auction.end_time)) { // Check if already ended strictly
      await t.rollback();
      // Optionally trigger endAuctionLogic here if it hasn't run
      return res.status(400).json({ message: 'Auction has already ended.' });
    }

    const requiredBid = auction.bid_count === 0 ? auction.starting_price : parseFloat(auction.current_price) + 0.01;
    if (bidAmount < requiredBid) {
      await t.rollback();
      return res.status(400).json({ message: `Your bid must be at least $${requiredBid.toFixed(2)}` });
    }

    const bid = await Bid.create({
      auction_id, user_id, amount: bidAmount,
    }, { transaction: t });

    auction.current_price = bidAmount;
    auction.bid_count += 1;
    auction.winner_id = user_id; // Tentative winner is the current highest bidder

    // --- TIMER RESET LOGIC ---
    auction.end_time = new Date(Date.now() + AUCTION_RESET_DURATION_MS);
    await auction.save({ transaction: t });

    // Clear existing timer and set a new one
    if (activeAuctionTimers.has(auction.auction_id)) {
        clearTimeout(activeAuctionTimers.get(auction.auction_id));
        console.log(`[Bid Placed] Cleared existing timer for auction ${auction.auction_id}.`);
    }
    const newTimeoutId = setTimeout(async () => {
        console.log(`[Timeout Executed] Ending auction ${auction.auction_id} due to timeout after bid.`);
        await endAuctionLogic(auction.auction_id);
        activeAuctionTimers.delete(auction.auction_id);
    }, AUCTION_RESET_DURATION_MS + 1000); // +1s buffer
    activeAuctionTimers.set(auction.auction_id, newTimeoutId);
    console.log(`[Bid Placed] Timer reset for auction ${auction.auction_id}. New end_time: ${auction.end_time}. New TimeoutID: ${newTimeoutId}`);
    // --- END TIMER RESET LOGIC ---

    await t.commit();

    // Emit WebSocket event: newBid or auctionUpdated - Simulated by returning full details
    const updatedAuctionDetails = await getFullAuctionDetails(auction.auction_id);
    const bidDetails = await Bid.findByPk(bid.bid_id, { // Fetch bid with user for response
        include: [{ model: User, attributes: ['user_id', 'username', 'profile_picture_url']}]
    });

    res.status(201).json({
        message: 'Bid placed successfully',
        bid: bidDetails,
        auction: updatedAuctionDetails // Send full updated auction
    });

  } catch (error) {
    await t.rollback();
    console.error('Error placing bid:', error);
    res.status(500).json({ message: 'Server error placing bid' });
  }
};

// Internal logic to end an auction
export const endAuctionLogic = async (auctionId) => {
    console.log(`[endAuctionLogic] Attempting to end auction ${auctionId}`);
    const t = await sequelize.transaction();
    try {
        // Clear timer from our map immediately if it's still there
        if (activeAuctionTimers.has(auctionId)) {
            clearTimeout(activeAuctionTimers.get(auctionId));
            activeAuctionTimers.delete(auctionId);
            console.log(`[endAuctionLogic] Cleared and removed timer for auction ${auctionId} from map.`);
        }

        const auction = await Auction.findByPk(auctionId, {
            include: [
              { model: Product, required: true } 
            ], // Include winner to get username for event
            transaction: t,
            lock: t.LOCK.UPDATE
        });

        if (!auction || auction.status !== 'active') {
            console.log(`[endAuctionLogic] Auction ${auctionId} not found or not active. Status: ${auction ? auction.status : 'N/A'}`);
            await t.rollback();
            return;
        }

        // Re-verify winner: The last bid sets auction.winner_id tentatively.
        // If no bids, winner_id would be null.
        const winningBid = await Bid.findOne({
            where: { auction_id: auctionId, is_cancelled: false },
            order: [['amount', 'DESC'], ['bid_time', 'ASC']],
            include: [{ model: User, attributes: ['user_id', 'username'] }],
            transaction: t
        });

        if (winningBid) { // A bid was placed
             auction.winner_id = winningBid.user_id;
            if (auction.reserve_price && winningBid.amount < auction.reserve_price) {
                auction.status = 'unsold';
                console.log(`[endAuctionLogic] Auction ${auctionId} unsold (reserve not met). Bid: ${winningBid.amount}, Reserve: ${auction.reserve_price}`);
            } else {
                auction.status = 'sold';
                auction.current_price = winningBid.amount; // Final price
                winningBid.is_winning = true;
                await winningBid.save({ transaction: t });
                console.log(`[endAuctionLogic] Auction ${auctionId} sold to user ${winningBid.user_id} for ${winningBid.amount}`);
                await Order.create({
                    buyer_id: winningBid.user_id,
                    seller_id: auction.Product.user_id,
                    auction_id: auction.auction_id,
                    total_amount: winningBid.amount,
                    status: 'pending',
                }, { transaction: t });
                console.log(`[endAuctionLogic] Order created for auction ${auctionId}`);
            }
        } else { // No bids at all
            auction.status = 'unsold';
            auction.winner_id = null;
            console.log(`[endAuctionLogic] Auction ${auctionId} unsold (no bids).`);
        }

        auction.end_time = new Date(); // Actual end time
        await auction.save({ transaction: t });
        await t.commit();

        // Emit WebSocket event: auctionEnded (auctionDetails)
        // Fetch final details for the event
        const finalAuctionDetails = await getFullAuctionDetails(auctionId);
        console.log(`[endAuctionLogic] Auction ${auctionId} ended with status: ${finalAuctionDetails.status}. Winner: ${finalAuctionDetails.winner?.username || 'None'}`);
        // In a real app, you'd emit `finalAuctionDetails` here.
        // For this simulation, the frontend will detect the status change when it fetches or based on last update.

    } catch (error) {
        await t.rollback();
        console.error(`[endAuctionLogic] Error for auction ${auctionId}:`, error);
    }
};

// @desc    Cancel a pending or active auction (owner only)
export const cancelAuction = async (req, res) => {
    const auctionIdToCancel = req.params.id;
    const currentUserId = req.user.user_id; // Assuming 'protect' middleware adds req.user

    const t = await sequelize.transaction();
    try {
        const auction = await Auction.findByPk(auctionIdToCancel, {
            include: [
                { model: Product, required: true }, // Auction must have a product
                { model: Stream, required: false }  // Stream is optional
            ],
            transaction: t
        });

        if (!auction) {
            await t.rollback();
            return res.status(404).json({ message: 'Auction not found' });
        }

        // Authorization: Only product owner or stream owner (if auction is in stream) can cancel
        const productOwnerId = auction.Product.user_id;
        const streamOwnerId = auction.Stream ? auction.Stream.user_id : null;

        let authorized = false;
        if (currentUserId === productOwnerId) {
            authorized = true;
        } else if (streamOwnerId && currentUserId === streamOwnerId) {
            authorized = true;
        }
        // You might add an admin role check here too if needed: || req.user.isAdmin

        if (!authorized) {
            await t.rollback();
            return res.status(403).json({ message: 'Not authorized to cancel this auction' });
        }

        // Check if auction can be cancelled
        if (auction.status === 'sold' || auction.status === 'unsold' || auction.status === 'cancelled') {
            await t.rollback();
            return res.status(400).json({ message: `Auction cannot be cancelled. Current status: ${auction.status}` });
        }

        // If auction was active, clear its server-side timer using the service
        if (auction.status === 'active') {
            clearAuctionTimer(auction.auction_id);
            console.log(`[Cancel Auction] Cleared server-side timer for active auction ${auction.auction_id}.`);
        }

        // Update auction status
        auction.status = 'cancelled';
        auction.end_time = new Date(); // Mark the cancellation time as its end time
        // auction.winner_id = null; // Ensure no winner if cancelled while active with a high bidder
        await auction.save({ transaction: t });

        await t.commit();

        const cancelledAuctionDetails = await getFullAuctionDetails(auction.auction_id);
        
        // TODO: Emit WebSocket event: auctionCancelled (cancelledAuctionDetails) to all clients in the stream/room
        // Example: sendLiveKitData('AUCTION_CANCELLED', cancelledAuctionDetails); // If using StreamPage's sendLiveKitData

        console.log(`Auction ${auction.auction_id} cancelled successfully by user ${currentUserId}.`);
        res.status(200).json({ message: 'Auction cancelled successfully', auction: cancelledAuctionDetails });

    } catch (error) {
        await t.rollback();
        console.error(`Error cancelling auction ${auctionIdToCancel}:`, error);
        res.status(500).json({ message: 'Server error while cancelling auction' });
    }
};



// --- Other auction controllers (getAllAuctions, getAuctionById) remain largely the same ---
// ... (ensure getAuctionById includes ProductImage if needed)
export const getAllAuctions = async (req, res) => {
  const { streamId, productId, status, userId } = req.query;
  let whereClause = {};

  if (streamId) whereClause.stream_id = streamId;
  if (productId) whereClause.product_id = productId;
  if (status) whereClause.status = status;
  if (userId) {
      const userProducts = await Product.findAll({ where: { user_id: userId }, attributes: ['product_id']});
      const productIds = userProducts.map(p => p.product_id);
      if (productIds.length === 0) return res.json([]);
      whereClause.product_id = { [Op.in]: productIds };
  }

  try {
    const auctions = await Auction.findAll({
      where: whereClause,
      include: [
        {
            model: Product,
            include: [
                { model: User, as: 'Owner', attributes: ['user_id', 'username', 'profile_picture_url'] },
                { model: ProductImage, as: 'images', where: { is_primary: true }, required: false }
            ]
        },
        { model: Stream, attributes: ['stream_id', 'title', 'status'] },
        { model: User, as: 'winner', attributes: ['user_id', 'username'] },
      ],
      order: [['start_time', 'DESC'], ['created_at', 'DESC']],
    });
    console.log(`[getAllAuctions Backend] streamId: ${streamId}, status: ${status}. Found auctions:`, JSON.stringify(auctions, null, 2));
    res.status(200).json(auctions);
  } catch (error) {
    console.error('[getAllAuctions Backend] Error fetching auctions:', error);
    res.status(500).json({ message: 'Server error while fetching auctions' });
  }
};

export const getAuctionById = async (req, res) => {
  try {
    const auction = await getFullAuctionDetails(req.params.id); // Use helper
    if (!auction) {
      return res.status(404).json({ message: 'Auction not found' });
    }
    res.status(200).json(auction);
  } catch (error) {
    console.error('Error fetching auction by ID:', error);
    res.status(500).json({ message: 'Server error while fetching auction' });
  }
};