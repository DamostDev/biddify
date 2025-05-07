import { Auction, Product, Stream, User, Bid, Order, sequelize } from '../models/index.js';
import { Op } from 'sequelize';

// @desc    Create a new auction (typically within a stream)
// @route   POST /api/auctions
// @access  Protected (Stream Owner or Product Owner if not in stream)
export const createAuction = async (req, res) => {
  const {
    product_id,
    stream_id, // Optional: auction can be standalone or linked to a stream
    starting_price,
    reserve_price, // Optional
    duration_seconds = 60, // Default duration
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
    // Authorization: Ensure the user creating the auction owns the product
    if (product.user_id !== user_id) {
      await t.rollback();
      return res.status(403).json({ message: 'You can only auction your own products' });
    }
    if (!product.is_active) {
        await t.rollback();
        return res.status(400).json({ message: 'Product is not active and cannot be auctioned' });
    }

    // Optional: If stream_id is provided, validate it
    let stream = null;
    if (stream_id) {
      stream = await Stream.findByPk(stream_id, { transaction: t });
      if (!stream) {
        await t.rollback();
        return res.status(404).json({ message: 'Stream not found' });
      }
      // Authorization: Ensure the user owns the stream if auction is tied to it
      if (stream.user_id !== user_id) {
        await t.rollback();
        return res.status(403).json({ message: 'You can only create auctions within your own streams' });
      }
      if (stream.status !== 'live' && stream.status !== 'scheduled') { // Or just 'live'
        await t.rollback();
        return res.status(400).json({ message: 'Auctions can only be created for live or scheduled streams' });
      }
    }

    // Check if product is already in an active or pending auction
    const existingAuction = await Auction.findOne({
        where: {
            product_id,
            status: { [Op.in]: ['pending', 'active'] }
        },
        transaction: t
    });
    if (existingAuction) {
        await t.rollback();
        return res.status(400).json({ message: 'This product is already in an active or pending auction.' });
    }


    const auction = await Auction.create({
      product_id,
      stream_id: stream_id || null,
      user_id: product.user_id, // The seller is the product owner
      starting_price,
      current_price: starting_price, // Initially current price is starting price
      reserve_price: reserve_price || null,
      duration_seconds,
      status: 'pending', // Auction is created but not yet started
      bid_count: 0,
    }, { transaction: t });

    await t.commit();

    const newAuctionDetails = await Auction.findByPk(auction.auction_id, {
        include: [
            { model: Product, include: [{model: User, attributes: ['user_id', 'username']}] },
            { model: Stream, attributes: ['stream_id', 'title'] },
        ]
    });

    res.status(201).json(newAuctionDetails);
  } catch (error) {
    await t.rollback();
    console.error('Error creating auction:', error);
    res.status(500).json({ message: 'Server error creating auction' });
  }
};

// @desc    Get all auctions (with filters)
// @route   GET /api/auctions
// @access  Public
export const getAllAuctions = async (req, res) => {
  const { streamId, productId, status, userId } = req.query;
  let whereClause = {};

  if (streamId) whereClause.stream_id = streamId;
  if (productId) whereClause.product_id = productId;
  if (status) whereClause.status = status;
  if (userId) { // Auctions where this user is the seller (product owner)
      const userProducts = await Product.findAll({ where: { user_id: userId }, attributes: ['product_id']});
      const productIds = userProducts.map(p => p.product_id);
      if (productIds.length === 0) return res.json([]); // No products, so no auctions
      whereClause.product_id = { [Op.in]: productIds };
  }


  try {
    const auctions = await Auction.findAll({
      where: whereClause,
      include: [
        {
            model: Product,
            include: [
                { model: User, attributes: ['user_id', 'username', 'profile_picture_url'] }, // Seller info
                { model: ProductImage, as: 'images', where: { is_primary: true }, required: false }
            ]
        },
        { model: Stream, attributes: ['stream_id', 'title', 'status'] },
        { model: User, as: 'winner', attributes: ['user_id', 'username'] },
      ],
      order: [['start_time', 'DESC'], ['created_at', 'DESC']],
      // Add pagination later
    });
    res.status(200).json(auctions);
  } catch (error) {
    console.error('Error fetching auctions:', error);
    res.status(500).json({ message: 'Server error while fetching auctions' });
  }
};

// @desc    Get a single auction by ID
// @route   GET /api/auctions/:id
// @access  Public
export const getAuctionById = async (req, res) => {
  try {
    const auction = await Auction.findByPk(req.params.id, {
      include: [
        {
            model: Product,
            include: [
                { model: User, attributes: ['user_id', 'username', 'profile_picture_url', 'seller_rating']},
                { model: ProductImage, as: 'images', order: [['is_primary', 'DESC']] }
            ]
        },
        { model: Stream, include: [{ model: User, attributes: ['user_id', 'username']}]}, // Streamer info
        { model: User, as: 'winner', attributes: ['user_id', 'username'] },
        { model: Bid, include: [{model: User, attributes:['user_id', 'username', 'profile_picture_url']}], order: [['bid_time', 'DESC']], limit: 10 } // Last 10 bids
      ],
    });

    if (!auction) {
      return res.status(404).json({ message: 'Auction not found' });
    }
    res.status(200).json(auction);
  } catch (error) {
    console.error('Error fetching auction by ID:', error);
    res.status(500).json({ message: 'Server error while fetching auction' });
  }
};

// @desc    Start a pending auction
// @route   POST /api/auctions/:id/start
// @access  Protected (Stream Owner / Product Owner)
export const startAuction = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const auction = await Auction.findByPk(req.params.id, {
        include: [Product, Stream], // Eager load for auth checks
        transaction: t
    });

    if (!auction) {
      await t.rollback();
      return res.status(404).json({ message: 'Auction not found' });
    }

    // Authorization:
    // If tied to a stream, stream owner can start.
    // If standalone, product owner can start.
    const productOwnerId = auction.Product.user_id;
    const streamOwnerId = auction.Stream ? auction.Stream.user_id : null;

    if (req.user.user_id !== productOwnerId && (streamOwnerId && req.user.user_id !== streamOwnerId)) {
        await t.rollback();
        return res.status(403).json({ message: 'Not authorized to start this auction' });
    }

    if (auction.status !== 'pending') {
      await t.rollback();
      return res.status(400).json({ message: `Auction is not pending, its status is ${auction.status}` });
    }

    auction.status = 'active';
    auction.start_time = new Date();
    auction.end_time = new Date(auction.start_time.getTime() + auction.duration_seconds * 1000);

    await auction.save({ transaction: t });
    await t.commit();

    // TODO: Emit WebSocket event: auctionStarted (auction)
    console.log(`Auction ${auction.auction_id} started. Ends at: ${auction.end_time}`);

    // Schedule auction end (simple timeout for now, robust solution would use a job queue)
    setTimeout(async () => {
        await endAuctionLogic(auction.auction_id);
    }, auction.duration_seconds * 1000 + 1000); // Add a small buffer

    res.status(200).json({ message: 'Auction started successfully', auction });

  } catch (error) {
    await t.rollback();
    console.error('Error starting auction:', error);
    res.status(500).json({ message: 'Server error starting auction' });
  }
};

// Internal logic to end an auction, determine winner, and create order if applicable
export const endAuctionLogic = async (auctionId) => {
    console.log(`Attempting to end auction ${auctionId}`);
    const t = await sequelize.transaction();
    try {
        const auction = await Auction.findByPk(auctionId, {
            include: [Product], // Need product for seller_id
            transaction: t,
            lock: t.LOCK.UPDATE // Lock the row for update
        });

        if (!auction || auction.status !== 'active') {
            console.log(`Auction ${auctionId} not found or not active. Current status: ${auction ? auction.status : 'N/A'}`);
            await t.rollback();
            return;
        }

        const winningBid = await Bid.findOne({
            where: { auction_id: auctionId, is_cancelled: false },
            order: [['amount', 'DESC'], ['bid_time', 'ASC']], // Highest bid, earliest time for ties
            transaction: t
        });

        if (winningBid) {
            // Check reserve price if set
            if (auction.reserve_price && winningBid.amount < auction.reserve_price) {
                auction.status = 'unsold'; // Reserve not met
                auction.winner_id = null;
                 console.log(`Auction ${auctionId} unsold (reserve not met). Winning bid: ${winningBid.amount}, Reserve: ${auction.reserve_price}`);
            } else {
                auction.status = 'sold';
                auction.winner_id = winningBid.user_id;
                auction.current_price = winningBid.amount; // Final selling price
                winningBid.is_winning = true;
                await winningBid.save({ transaction: t });
                console.log(`Auction ${auctionId} sold to user ${winningBid.user_id} for ${winningBid.amount}`);

                // Create Order
                await Order.create({
                    buyer_id: winningBid.user_id,
                    seller_id: auction.Product.user_id,
                    auction_id: auction.auction_id,
                    total_amount: winningBid.amount,
                    // shipping_cost and tax_amount can be calculated later or set to 0
                    status: 'pending', // Pending payment
                    // payment_intent_id: null,
                    // shipping_address: null,
                }, { transaction: t });
                console.log(`Order created for auction ${auctionId}`);
            }
        } else {
            auction.status = 'unsold'; // No bids
            console.log(`Auction ${auctionId} unsold (no bids).`);
        }

        auction.end_time = new Date(); // Ensure end_time is accurately set
        await auction.save({ transaction: t });
        await t.commit();

        // TODO: Emit WebSocket event: auctionEnded (auction)
        // TODO: Notify winner and seller
        console.log(`Auction ${auctionId} officially ended with status: ${auction.status}`);

    } catch (error) {
        await t.rollback();
        console.error(`Error in endAuctionLogic for auction ${auctionId}:`, error);
        // Handle error, maybe retry or mark auction as needing manual review
    }
};


// @desc    Cancel a pending or active auction (owner only)
// @route   POST /api/auctions/:id/cancel
// @access  Protected (Product Owner / Stream Owner)
export const cancelAuction = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const auction = await Auction.findByPk(req.params.id, {
            include: [Product, Stream],
            transaction: t
        });

        if (!auction) {
            await t.rollback();
            return res.status(404).json({ message: 'Auction not found' });
        }

        const productOwnerId = auction.Product.user_id;
        const streamOwnerId = auction.Stream ? auction.Stream.user_id : null;

        if (req.user.user_id !== productOwnerId && (streamOwnerId && req.user.user_id !== streamOwnerId)) {
            await t.rollback();
            return res.status(403).json({ message: 'Not authorized to cancel this auction' });
        }

        if (auction.status === 'sold' || auction.status === 'unsold' || auction.status === 'cancelled') {
            await t.rollback();
            return res.status(400).json({ message: `Auction cannot be cancelled, its status is ${auction.status}` });
        }

        auction.status = 'cancelled';
        auction.end_time = new Date(); // Mark end time as now
        await auction.save({ transaction: t });
        await t.commit();

        // TODO: Emit WebSocket event: auctionCancelled (auction)
        // TODO: Notify bidders if any

        res.status(200).json({ message: 'Auction cancelled successfully', auction });
    } catch (error) {
        await t.rollback();
        console.error('Error cancelling auction:', error);
        res.status(500).json({ message: 'Server error cancelling auction' });
    }
};

// Note: Update and Delete for auctions might be complex.
// Updating an active auction is generally disallowed.
// Deleting might only be for 'pending' or 'cancelled' auctions.
// For now, focus on create, get, start, cancel, and automatic ending.