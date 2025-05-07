import express from 'express';
import {
  createAuction,
  getAllAuctions,
  getAuctionById,
  startAuction,
  cancelAuction,
  // No direct 'endAuction' endpoint, it's handled by timeout or manually if needed
} from '../controllers/auction.controller.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .post(protect, createAuction)
  .get(getAllAuctions); // Public, with filters

router.route('/:id')
  .get(getAuctionById); // Public

router.post('/:id/start', protect, startAuction);
router.post('/:id/cancel', protect, cancelAuction);

// Deleting auctions might be restricted (e.g., only if 'pending' or 'cancelled')
// router.delete('/:id', protect, deleteAuction); // Implement if needed

export default router;