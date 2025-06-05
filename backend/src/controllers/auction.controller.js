// backend/src/controllers/auction.controller.js
import { Auction, Product, Stream, User, Bid, Order, ProductImage, sequelize } from '../models/index.js'; // Added Order
import { Op } from 'sequelize';
import { scheduleAuctionEnd, clearAuctionTimer, setEndAuctionFunction } from '../lib/AuctionTimerLogic.js';
import { RoomServiceClient, DataPacket_Kind } from 'livekit-server-sdk';
import dotenv from 'dotenv';

dotenv.config();

// --- Initialize RoomServiceClient (existing code) ---
// ... (your RoomServiceClient initialization) ...
let roomServiceInstance = null;
const livekitControllerApiUrl = process.env.LIVEKIT_URL ? process.env.LIVEKIT_URL.replace(/^wss?:\/\//, 'https://') : null;

if (process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET && livekitControllerApiUrl) {
  try {
    roomServiceInstance = new RoomServiceClient(
      livekitControllerApiUrl,
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET
    );
    console.log('[AuctionController Init] ✅ LiveKit RoomServiceClient initialized successfully.');
  } catch (e) {
    console.error('🔴 [AuctionController Init] Error initializing RoomServiceClient:', e.message, e);
    roomServiceInstance = null;
  }
} else {
  console.warn('⚠️ [AuctionController Init] RoomServiceClient NOT initialized. Prerequisites not met:');
  if (!livekitControllerApiUrl) console.warn('  - LIVEKIT_URL missing or invalid.');
  if (!process.env.LIVEKIT_API_KEY) console.warn('  - LIVEKIT_API_KEY missing.');
  if (!process.env.LIVEKIT_API_SECRET) console.warn('  - LIVEKIT_API_SECRET missing.');
}

async function sendDataToLiveKitRoom(roomName, type, payloadData) {
    if (!roomServiceInstance) {
        console.error('[AuctionCtrl SendMsg] RoomService not initialized. Cannot send message.');
        return;
    }
    if (!roomName) {
        console.error('[AuctionCtrl SendMsg] roomName missing for sendDataToLiveKitRoom.');
        return;
    }
    try {
        const dataToSend = { type, payload: payloadData, senderIdentity: 'server-auction-system' };
        const encodedPayload = new TextEncoder().encode(JSON.stringify(dataToSend));
        await roomServiceInstance.sendData(roomName, encodedPayload, DataPacket_Kind.RELIABLE, { topic: "auction_updates" });
        console.log(`[AuctionCtrl SendMsg] Sent ${type} to room ${roomName}.`);
    } catch (e) {
        console.error(`[AuctionCtrl SendMsg] Error sending ${type} to room ${roomName}:`, e);
    }
}

const getFullAuctionDetails = async (auctionId, transaction = null) => {
    return await Auction.findByPk(auctionId, {
        include: [
            {
                model: Product,
                include: [
                    { model: User, as: 'Owner', attributes: ['user_id', 'username', 'profile_picture_url'] },
                    { model: ProductImage, as: 'images', order: [['is_primary', 'DESC']] }
                ]
            },
            { model: Stream, attributes: ['stream_id', 'title', 'livekitRoomName'] },
            { model: User, as: 'winner', attributes: ['user_id', 'username'] },
            { model: Bid, include: [{model: User, attributes:['user_id', 'username']}], order: [['bid_time', 'DESC']], limit: 3 }
        ],
        transaction
    });
};


const actualEndAuctionLogic = async (auctionId) => {
    console.log(`[actualEndAuctionLogic] Attempting to end auction ${auctionId}`);
    const t = await sequelize.transaction();
    let committed = false;

    try {
        clearAuctionTimer(auctionId); 

        const auction = await Auction.findByPk(auctionId, {
            include: [{ 
                model: Product, 
                required: true // Ensures product exists
            }],
            transaction: t,
            lock: t.LOCK.UPDATE 
        });

        if (!auction) {
            console.log(`[actualEndAuctionLogic] Auction ${auctionId} not found.`);
            if (t && !t.finished) await t.rollback();
            return;
        }
        
        // Check if auction is already ended to prevent re-processing
        if (auction.status !== 'active') {
            console.log(`[actualEndAuctionLogic] Auction ${auctionId} is not active. Status: ${auction.status}. No action taken.`);
            if (t && !t.finished) await t.rollback(); // Rollback if transaction was started for this check
            return; // Exit if not active
        }


        const winningBid = await Bid.findOne({
            where: { auction_id: auctionId, is_cancelled: false },
            order: [['amount', 'DESC'], ['bid_time', 'ASC']],
            include: [{ model: User, attributes: ['user_id', 'username'] }],
            transaction: t
        });

        let finalStatus = 'unsold'; // Default to unsold

        if (winningBid) {
            if (auction.reserve_price && winningBid.amount < auction.reserve_price) {
                finalStatus = 'unsold';
                console.log(`[actualEndAuctionLogic] Auction ${auctionId}: Winning bid ${winningBid.amount} did not meet reserve price ${auction.reserve_price}.`);
            } else {
                finalStatus = 'sold';
                auction.winner_id = winningBid.user_id;
                auction.current_price = winningBid.amount;
                
                winningBid.is_winning = true;
                await winningBid.save({ transaction: t });

                // ---- START: Create Order and Update Product ----
                await Order.create({
                    buyer_id: winningBid.user_id,
                    seller_id: auction.Product.user_id, // Product owner is the seller
                    auction_id: auction.auction_id,
                    total_amount: winningBid.amount,
                    status: 'pending', // Initial status, can be 'pending_payment'
                }, { transaction: t });
                console.log(`[actualEndAuctionLogic] Order created for auction ${auctionId}. Buyer: ${winningBid.user_id}, Seller: ${auction.Product.user_id}`);

                const productBeingSold = await Product.findByPk(auction.product_id, { transaction: t });
                if (productBeingSold) {
                    productBeingSold.is_active = false; // Mark as sold/inactive
                    await productBeingSold.save({ transaction: t });
                    console.log(`[actualEndAuctionLogic] Product ${productBeingSold.product_id} marked as inactive.`);
                } else {
                    console.warn(`[actualEndAuctionLogic] Product ${auction.product_id} not found when trying to mark as inactive. Auction will still be closed.`);
                }
                // ---- END: Create Order and Update Product ----
            }
        } else {
            console.log(`[actualEndAuctionLogic] Auction ${auctionId} ended with no bids.`);
            auction.winner_id = null;
        }

        auction.status = finalStatus;
        auction.end_time = new Date();
        await auction.save({ transaction: t });

        await t.commit();
        committed = true;

        const finalAuctionDetails = await getFullAuctionDetails(auctionId);
        console.log(`[actualEndAuctionLogic] Auction ${auctionId} ended with status: ${finalAuctionDetails?.status}. Winner: ${finalAuctionDetails?.winner?.username || 'None'}`);

        if (finalAuctionDetails && finalAuctionDetails.Stream && finalAuctionDetails.Stream.livekitRoomName) {
            await sendDataToLiveKitRoom(
                finalAuctionDetails.Stream.livekitRoomName,
                'AUCTION_ENDED',
                finalAuctionDetails
            );
        } else {
            console.warn(`[actualEndAuctionLogic] Could not send AUCTION_ENDED: Stream info or livekitRoomName missing for auction ${auctionId}.`);
        }

    } catch (error) {
        console.error(`[actualEndAuctionLogic] Error processing auction ${auctionId}:`, error);
        if (!committed && t && !t.finished) {
            try {
                await t.rollback();
                console.log(`[actualEndAuctionLogic] Transaction rolled back for auction ${auctionId} due to error.`);
            } catch (rollbackError) {
                console.error(`[actualEndAuctionLogic] CRITICAL: Error rolling back transaction for auction ${auctionId}:`, rollbackError);
            }
        }
    }
};

setEndAuctionFunction(actualEndAuctionLogic); // Ensure this is called

// ... (rest of your auction controller, e.g., createAuction, startAuction, placeBid, etc.)
// Ensure your placeBid also uses a transaction and locks the auction row for updates.
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
  let committedBid = false; // Renamed to avoid conflict
  try {
    const auction = await Auction.findByPk(auction_id, {
        include: [ { model: Product, required: true } ], // Ensure product is included
        transaction: t,
        lock: t.LOCK.UPDATE // Lock the auction row
    });

    if (!auction) {
      await t.rollback();
      return res.status(404).json({ message: 'Auction not found' });
    }
    if (auction.Product.user_id === user_id) { // Check against product owner
        await t.rollback();
        return res.status(403).json({ message: 'You cannot bid on your own auction.' });
    }
    if (auction.status !== 'active') {
      await t.rollback();
      return res.status(400).json({ message: `Auction is not active. Status: ${auction.status}` });
    }
    if (new Date() >= new Date(auction.end_time)) {
      await t.rollback();
      return res.status(400).json({ message: 'Auction has already ended.' });
    }

    const requiredBid = auction.bid_count === 0 ? parseFloat(auction.starting_price) : parseFloat(auction.current_price) + 0.01;
    if (bidAmount < requiredBid) {
      await t.rollback();
      return res.status(400).json({ message: `Your bid must be at least $${requiredBid.toFixed(2)}` });
    }

    const bid = await Bid.create({
      auction_id, user_id, amount: bidAmount,
    }, { transaction: t });

    auction.current_price = bidAmount;
    auction.bid_count += 1;
    auction.winner_id = user_id;

    // Get AUCTION_RESET_DURATION_MS from config or define it
    const AUCTION_RESET_DURATION_MS_FROM_CONFIG = 30 * 1000; // Example: 30 seconds
    auction.end_time = new Date(Date.now() + AUCTION_RESET_DURATION_MS_FROM_CONFIG);
    await auction.save({ transaction: t });

    // Re-schedule the auction end timer
    scheduleAuctionEnd(auction.auction_id); // Use the service

    await t.commit();
    committedBid = true; // Renamed

    const updatedAuctionDetails = await getFullAuctionDetails(auction.auction_id);
    if (updatedAuctionDetails && updatedAuctionDetails.Stream && updatedAuctionDetails.Stream.livekitRoomName) {
        await sendDataToLiveKitRoom(
            updatedAuctionDetails.Stream.livekitRoomName,
            'AUCTION_UPDATED',
            updatedAuctionDetails
        );
    } else {
        console.warn(`[placeBid] Could not send AUCTION_UPDATED message for auction ${auction.auction_id}: Stream info or livekitRoomName missing.`);
    }

    const bidDetails = await Bid.findByPk(bid.bid_id, {
        include: [{ model: User, attributes: ['user_id', 'username', 'profile_picture_url']}]
    });

    res.status(201).json({
        message: 'Bid placed successfully',
        bid: bidDetails,
        auction: updatedAuctionDetails
    });
  } catch (error) {
    if (!committedBid && t && !t.finished) await t.rollback(); // Renamed
    console.error('Error placing bid:', error);
    res.status(500).json({ message: 'Server error placing bid' });
  }
};


export const createAuction = async (req, res) => {
  const {
    product_id,
    stream_id,
    starting_price,
    reserve_price,
    duration_seconds = 30, 
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
    if (!product.is_active) { // Crucial check
        await t.rollback();
        return res.status(400).json({ message: 'Product is not active (e.g. already sold) and cannot be auctioned' });
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
      // user_id: product.user_id, // Not needed in Auction model directly, inferred via Product
      starting_price,
      current_price: starting_price,
      reserve_price: reserve_price || null,
      duration_seconds, 
      status: 'pending', 
      bid_count: 0,
    }, { transaction: t });

    await t.commit();
    const newAuctionDetails = await getFullAuctionDetails(auction.auction_id);
    res.status(201).json(newAuctionDetails);
  } catch (error) {
    if (t && !t.finished) await t.rollback();
    console.error('Error creating auction:', error);
    res.status(500).json({ message: 'Server error creating auction' });
  }
};

export const startAuction = async (req, res) => {
  const t = await sequelize.transaction();
  let committedStart = false;
  try {
    const auction = await Auction.findByPk(req.params.id, {
        include: [
            { model: Product, required: true }, // Ensure product is loaded
            Stream
        ], 
        transaction: t
    });
    
    if (!auction) { await t.rollback(); return res.status(404).json({ message: 'Auction not found' }); }
    
    // Authorization check: either product owner or stream owner (if stream auction)
    const isProductOwner = auction.Product.user_id === req.user.user_id;
    const isStreamOwner = auction.Stream && auction.Stream.user_id === req.user.user_id;

    if (!isProductOwner && !isStreamOwner) {
        await t.rollback(); return res.status(403).json({ message: 'Not authorized to start this auction' });
    }
    if (auction.status !== 'pending') { await t.rollback(); return res.status(400).json({message: `Auction status is ${auction.status}, cannot start.`}); }
    if (!auction.Product.is_active) { // Double-check product is still active
        await t.rollback(); return res.status(400).json({message: `Product is no longer active and cannot be auctioned.`});
    }


    auction.status = 'active';
    auction.start_time = new Date();
    // Initial end time (will be reset by bids)
    const AUCTION_INITIAL_DURATION_MS = (auction.duration_seconds * 1000) || (30 * 1000);
    auction.end_time = new Date(auction.start_time.getTime() + AUCTION_INITIAL_DURATION_MS); 
    await auction.save({ transaction: t });
    await t.commit();
    committedStart = true;

    scheduleAuctionEnd(auction.auction_id);

    const startedAuctionDetails = await getFullAuctionDetails(auction.auction_id);

    if (startedAuctionDetails && startedAuctionDetails.Stream && startedAuctionDetails.Stream.livekitRoomName) {
        await sendDataToLiveKitRoom(
            startedAuctionDetails.Stream.livekitRoomName,
            'AUCTION_STARTED',
            startedAuctionDetails // Send the fully detailed object
        );
    } else {
        console.warn(`[startAuction] Could not send AUCTION_STARTED message for auction ${auction.auction_id}. No stream or room name.`);
    }

    console.log(`Auction ${auction.auction_id} started. Ends at: ${auction.end_time}. Timer scheduled.`);
    // Return the full auction details in the response
    res.status(200).json({ message: 'Auction started successfully', auction: startedAuctionDetails });
  } catch (error) {
    if (!committedStart && t && !t.finished) await t.rollback();
    console.error('Error starting auction:', error);
    res.status(500).json({ message: 'Server error starting auction' });
  }
};

export const cancelAuction = async (req, res) => {
    const auctionIdToCancel = req.params.id;
    const currentUserId = req.user.user_id; 
    let committedCancel = false; // Flag for successful commit

    const t = await sequelize.transaction();
    try {
        const auction = await Auction.findByPk(auctionIdToCancel, {
            include: [
                { model: Product, required: true }, 
                { model: Stream, required: false }  
            ],
            transaction: t,
            lock: t.LOCK.UPDATE
        });

        if (!auction) {
            await t.rollback();
            return res.status(404).json({ message: 'Auction not found' });
        }

        const productOwnerId = auction.Product.user_id;
        const streamOwnerId = auction.Stream ? auction.Stream.user_id : null;
        let authorized = false;
        if (currentUserId === productOwnerId) authorized = true;
        else if (streamOwnerId && currentUserId === streamOwnerId) authorized = true;
        
        if (!authorized) {
            await t.rollback();
            return res.status(403).json({ message: 'Not authorized to cancel this auction' });
        }

        if (auction.status === 'sold' || auction.status === 'unsold' || auction.status === 'cancelled') {
            await t.rollback();
            return res.status(400).json({ message: `Auction cannot be cancelled. Current status: ${auction.status}` });
        }

        // --- If auction was active, reactivate product ---
        if (auction.status === 'active' || auction.status === 'pending') {
            const productToReactivate = await Product.findByPk(auction.product_id, { transaction: t });
            if (productToReactivate && !productToReactivate.is_active) {
                productToReactivate.is_active = true;
                await productToReactivate.save({ transaction: t });
                console.log(`[Cancel Auction] Product ${productToReactivate.product_id} reactivated.`);
            }
        }
        // --- End product reactivation ---


        if (auction.status === 'active') {
            clearAuctionTimer(auction.auction_id);
            console.log(`[Cancel Auction] Cleared server-side timer for active auction ${auction.auction_id}.`);
        }

        auction.status = 'cancelled';
        auction.end_time = new Date(); 
        await auction.save({ transaction: t });

        await t.commit();
        committedCancel = true;

        const cancelledAuctionDetails = await getFullAuctionDetails(auction.auction_id);
        if (cancelledAuctionDetails && cancelledAuctionDetails.Stream && cancelledAuctionDetails.Stream.livekitRoomName) {
            await sendDataToLiveKitRoom(
                cancelledAuctionDetails.Stream.livekitRoomName,
                'AUCTION_ENDED', 
                cancelledAuctionDetails
            );
        } else {
            console.warn(`[cancelAuction] Could not send AUCTION_ENDED (cancelled) message for auction ${auction.auction_id}.`);
        }
        console.log(`Auction ${auction.auction_id} cancelled successfully by user ${currentUserId}.`);
        res.status(200).json({ message: 'Auction cancelled successfully', auction: cancelledAuctionDetails });

    } catch (error) {
        if (!committedCancel && t && !t.finished) await t.rollback();
        console.error(`Error cancelling auction ${req.params.id}:`, error);
        res.status(500).json({ message: 'Server error while cancelling auction' });
    }
};


export const getAllAuctions = async (req, res) => {
  const { streamId, productId, status, userId } = req.query;
  let whereClause = {};

  if (streamId) whereClause.stream_id = streamId;
  if (productId) whereClause.product_id = productId;
  if (status) whereClause.status = status;
  if (userId) { // To find auctions where products are owned by this user
      const userProducts = await Product.findAll({ where: { user_id: userId }, attributes: ['product_id']});
      const productIds = userProducts.map(p => p.product_id);
      if (productIds.length === 0) return res.json([]); // No products means no auctions by this user
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
        { model: Stream, attributes: ['stream_id', 'title', 'status', 'livekitRoomName'] }, // Added livekitRoomName
        { model: User, as: 'winner', attributes: ['user_id', 'username'] },
      ],
      order: [['start_time', 'DESC'], ['created_at', 'DESC']],
    });
    res.status(200).json(auctions);
  } catch (error) {
    console.error('[getAllAuctions Backend] Error fetching auctions:', error);
    res.status(500).json({ message: 'Server error while fetching auctions' });
  }
};

export const getAuctionById = async (req, res) => {
  try {
    const auction = await getFullAuctionDetails(req.params.id); 
    if (!auction) {
      return res.status(404).json({ message: 'Auction not found' });
    }
    res.status(200).json(auction);
  } catch (error) {
    console.error('Error fetching auction by ID:', error);
    res.status(500).json({ message: 'Server error while fetching auction' });
  }
};