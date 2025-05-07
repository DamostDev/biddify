import { Bid, Auction, User, sequelize } from '../models/index.js';
import { Op } from 'sequelize';

// @desc    Place a new bid on an auction
// @route   POST /api/bids
// @access  Protected
export const placeBid = async (req, res) => {
  const { auction_id, amount } = req.body;
  const user_id = req.user.user_id; // Bidder

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
        include: [ { model: Product } ], // For seller ID check
        transaction: t,
        lock: t.LOCK.UPDATE // Lock auction row to prevent race conditions on current_price
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
      return res.status(400).json({ message: `Auction is not active. Current status: ${auction.status}` });
    }

    if (new Date() > new Date(auction.end_time)) {
      await t.rollback();
      // Trigger end auction logic again just in case timeout failed, or simply inform user
      // await endAuctionLogic(auction.auction_id); // Be careful with re-triggering
      return res.status(400).json({ message: 'Auction has already ended.' });
    }

    // Check if bid amount is sufficient
    const minBidAmount = auction.current_price ? auction.current_price : auction.starting_price;
    // Add a bid increment rule, e.g., new bid must be at least current_price + $1
    const requiredBid = auction.bid_count === 0 ? auction.starting_price : minBidAmount + 0.01; // Smallest increment

    if (bidAmount < requiredBid) {
      await t.rollback();
      return res.status(400).json({ message: `Your bid must be at least $${requiredBid.toFixed(2)}` });
    }

    // Create the bid
    const bid = await Bid.create({
      auction_id,
      user_id,
      amount: bidAmount,
      is_winning: false, // Will be updated if it becomes the winning bid
    }, { transaction: t });

    // Update auction's current price and bid count
    auction.current_price = bidAmount;
    auction.bid_count += 1;
    await auction.save({ transaction: t });

    await t.commit();

    // TODO: Emit WebSocket event: newBid (bid, auction_id)
    // TODO: Notify previous high bidder (if any) they've been outbid

    const bidDetails = await Bid.findByPk(bid.bid_id, {
        include: [
            { model: User, attributes: ['user_id', 'username', 'profile_picture_url']},
            { model: Auction, attributes: ['auction_id', 'current_price', 'status']}
        ]
    });

    res.status(201).json({ message: 'Bid placed successfully', bid: bidDetails, auction_current_price: auction.current_price });

  } catch (error) {
    await t.rollback();
    console.error('Error placing bid:', error);
    res.status(500).json({ message: 'Server error placing bid' });
  }
};

// @desc    Get bids for a specific auction
// @route   GET /api/bids/auction/:auctionId
// @access  Public
export const getBidsByAuction = async (req, res) => {
  const { auctionId } = req.params;
  try {
    const auction = await Auction.findByPk(auctionId);
    if (!auction) {
      return res.status(404).json({ message: 'Auction not found' });
    }

    const bids = await Bid.findAll({
      where: { auction_id: auctionId, is_cancelled: false },
      include: [
        { model: User, attributes: ['user_id', 'username', 'profile_picture_url'] },
      ],
      order: [['bid_time', 'DESC']], // Newest bids first
      // Add pagination later
    });
    res.status(200).json(bids);
  } catch (error) {
    console.error('Error fetching bids for auction:', error);
    res.status(500).json({ message: 'Server error fetching bids' });
  }
};


// @desc    Get bids made by the logged-in user
// @route   GET /api/bids/my-bids
// @access  Protected
export const getMyBids = async (req, res) => {
    const user_id = req.user.user_id;
    try {
        const bids = await Bid.findAll({
            where: { user_id, is_cancelled: false },
            include: [
                {
                    model: Auction,
                    attributes: ['auction_id', 'status', 'current_price', 'end_time'],
                    include: [{ model: Product, attributes: ['product_id', 'title'], include: [{model: ProductImage, as: 'images', where:{is_primary: true}, required: false }] }]
                }
            ],
            order: [['bid_time', 'DESC']]
        });
        res.status(200).json(bids);
    } catch (error) {
        console.error('Error fetching user bids:', error);
        res.status(500).json({ message: 'Server error' });
    }
};


// Cancelling bids is usually a restricted operation, often not allowed or only under specific conditions.
// For now, we'll omit a direct "cancel bid" endpoint. It might be an admin function or based on auction owner's discretion.