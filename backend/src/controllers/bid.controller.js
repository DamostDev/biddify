// backend/src/controllers/bid.controller.js

import { Bid, Auction, User, Product, ProductImage, Stream, sequelize } from '../models/index.js';
import { scheduleAuctionEnd } from '../lib/AuctionTimerLogic.js';

export const placeBid = async (req, res) => {
  console.log('[Backend placeBid Controller] Received bid request. Body:', req.body, 'User ID:', req.user?.user_id);
  const { auction_id, amount } = req.body;
  const user_id = req.user.user_id;

  // ... (input validation) ...
  if (!auction_id || amount === undefined) { return res.status(400).json({ message: 'Auction ID and bid amount are required' }); }
  const bidAmount = parseFloat(amount);
  if (isNaN(bidAmount) || bidAmount <= 0) { return res.status(400).json({ message: 'Invalid bid amount' }); }


  const t = await sequelize.transaction();
  try {
    const auction = await Auction.findByPk(auction_id, {
        include: [{ model: Product, required: true }],
        transaction: t,
        lock: t.LOCK.UPDATE
    });

    // ... (all validation checks: !auction, owner check, status, end_time, requiredBid) ...
    if (!auction) { await t.rollback(); return res.status(404).json({ message: 'Auction not found' }); }
    if (auction.Product.user_id === user_id) { await t.rollback(); return res.status(403).json({ message: 'You cannot bid on your own auction.' }); }
    if (auction.status !== 'active') { await t.rollback(); return res.status(400).json({ message: `Auction is not active. Current status: ${auction.status}` }); }
    if (new Date() >= new Date(auction.end_time)) { await t.rollback(); return res.status(400).json({ message: 'Auction has already ended.' }); }
    const currentAuctionPrice = parseFloat(auction.current_price || auction.starting_price);
    const requiredBidVal = auction.bid_count === 0 ? parseFloat(auction.starting_price) : currentAuctionPrice + 0.01;
    if (bidAmount < requiredBidVal) { await t.rollback(); return res.status(400).json({ message: `Your bid must be at least $${requiredBidVal.toFixed(2)}` }); }


    const bid = await Bid.create({
      auction_id: auction.auction_id, user_id, amount: bidAmount,
    }, { transaction: t });

    auction.current_price = bidAmount;
    auction.bid_count += 1;
    auction.winner_id = user_id;
    auction.end_time = new Date(Date.now() + 30000); // Set new end time in DB
    await auction.save({ transaction: t });
    await t.commit(); // Commit DB changes

    scheduleAuctionEnd(auction.auction_id); // <<< USE THE SERVICE TO RESET THE SERVER-SIDE TIMEOUT

    // Fetch details for the response
    const updatedAuctionDetails = await Auction.findByPk(auction.auction_id, {
        include: [
            { model: Product, include: [{model: User, as: 'Owner'}, {model: ProductImage, as: 'images'}]},
            { model: Stream }, { model: User, as: 'winner' }
        ]
    });
    const bidDetails = await Bid.findByPk(bid.bid_id, {
        include: [{model: User, attributes:['user_id', 'username', 'profile_picture_url']}]
    });

    res.status(201).json({ message: 'Bid placed successfully', bid: bidDetails, auction: updatedAuctionDetails });

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
    // No need to lock for a simple read operation
    const auctionExists = await Auction.count({ where: { auction_id: auctionId }});
    if (!auctionExists) {
      return res.status(404).json({ message: 'Auction not found' });
    }

    const bids = await Bid.findAll({
      where: { auction_id: auctionId, is_cancelled: false },
      include: [
        { model: User, attributes: ['user_id', 'username', 'profile_picture_url'] },
      ],
      order: [['bid_time', 'DESC']],
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
                    include: [
                        {
                            model: Product,
                            attributes: ['product_id', 'title'],
                            include: [{model: ProductImage, as: 'images', where:{is_primary: true}, required: false }]
                        }
                    ]
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
