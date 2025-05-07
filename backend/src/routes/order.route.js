import express from 'express';
import {
  getMyOrders,
  getOrderById,
  updateOrderStatus,
  updateShippingAddress,
  // markOrderAsPaid,
} from '../controllers/order.controller.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/my-orders', protect, getMyOrders); // ?role=buyer or ?role=seller

router.route('/:id')
  .get(protect, getOrderById);

router.put('/:id/status', protect, updateOrderStatus);
router.put('/:id/shipping-address', protect, updateShippingAddress);
// router.put('/:id/pay', protect, markOrderAsPaid); // If implementing manual payment marking

export default router;