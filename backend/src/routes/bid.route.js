import express from 'express';
import {
  placeBid,
  getBidsByAuction,
  getMyBids
} from '../controllers/bid.controller.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, placeBid);
router.get('/auction/:auctionId', getBidsByAuction); // Public
router.get('/my-bids', protect, getMyBids); // Bids made by logged-in user

// router.delete('/:id', protect, cancelBid); // Implement if needed, with strict rules

export default router;