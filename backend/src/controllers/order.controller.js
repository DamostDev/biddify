import { Order, User, Auction, Product, ProductImage, sequelize } from '../models/index.js';
import { Op } from 'sequelize';

// @desc    Get orders for the logged-in user (as buyer or seller)
// @route   GET /api/orders/my-orders
// @access  Protected
export const getMyOrders = async (req, res) => {
  const user_id = req.user.user_id;
  const { role } = req.query; // 'buyer' or 'seller', defaults to both

  let whereClause = {
    [Op.or]: [{ buyer_id: user_id }, { seller_id: user_id }],
  };

  if (role === 'buyer') {
    whereClause = { buyer_id: user_id };
  } else if (role === 'seller') {
    whereClause = { seller_id: user_id };
  }

  try {
    const orders = await Order.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'buyer',
          attributes: ['user_id', 'username', 'profile_picture_url'],
        },
        {
          model: User,
          as: 'seller',
          attributes: ['user_id', 'username', 'profile_picture_url'],
        },
        {
          model: Auction,
          attributes: ['auction_id'], // Minimal auction info
          include: [
            {
              model: Product,
              attributes: ['product_id', 'title'],
              include: [{model: ProductImage, as: 'images', where: {is_primary: true}, required: false}]
            },
          ],
        },
      ],
      order: [['created_at', 'DESC']],
      // Add pagination later
    });
    res.status(200).json(orders);
  } catch (error) {
    console.error('Error fetching user orders:', error);
    res.status(500).json({ message: 'Server error fetching orders' });
  }
};

// @desc    Get a single order by ID
// @route   GET /api/orders/:id
// @access  Protected (Buyer or Seller of the order)
export const getOrderById = async (req, res) => {
  const user_id = req.user.user_id;
  try {
    const order = await Order.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'buyer',
          attributes: ['user_id', 'username', 'email', 'profile_picture_url'], // Include email for seller maybe
        },
        {
          model: User,
          as: 'seller',
          attributes: ['user_id', 'username', 'email', 'profile_picture_url'],
        },
        {
          model: Auction,
          include: [
            {
              model: Product,
              include: [
                { model: ProductImage, as: 'images', order: [['is_primary', 'DESC']] }
              ]
            },
          ],
        },
      ],
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Authorization: Ensure user is either the buyer or seller
    if (order.buyer_id !== user_id && order.seller_id !== user_id) {
      return res.status(403).json({ message: 'Not authorized to view this order' });
    }

    res.status(200).json(order);
  } catch (error) {
    console.error('Error fetching order by ID:', error);
    res.status(500).json({ message: 'Server error fetching order' });
  }
};

// @desc    Update order status (e.g., by seller to 'shipped', or 'delivered')
// @route   PUT /api/orders/:id/status
// @access  Protected (Primarily Seller, Buyer might confirm 'delivered')
export const updateOrderStatus = async (req, res) => {
  const { status } = req.body;
  const user_id = req.user.user_id;

  if (!status || !['pending', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded'].includes(status)) {
    return res.status(400).json({ message: 'Invalid or missing status' });
  }

  try {
    const order = await Order.findByPk(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Authorization:
    // Seller can change to 'shipped', 'cancelled' (if not paid), 'refunded' (after payment logic)
    // Buyer might be able to change to 'delivered' (or this could be automated via tracking)
    // Admin might change any status.
    // Simplified: Only seller can change status for now, except buyer to 'delivered'
    let authorized = false;
    if (order.seller_id === user_id) {
        if (['shipped', 'cancelled', 'refunded'].includes(status)) { // Seller actions
            authorized = true;
        }
         // Seller can also mark as paid if manual payment verification
        if (status === 'paid' && order.status === 'pending') {
            authorized = true;
        }
    }
    if (order.buyer_id === user_id) {
        if (status === 'delivered' && order.status === 'shipped') { // Buyer action
            authorized = true;
        }
    }

    if (!authorized) {
        return res.status(403).json({ message: `Not authorized to update order to status: ${status}` });
    }

    // Add more business logic for status transitions here, e.g.:
    // - Cannot ship if not 'paid'
    // - Cannot mark 'delivered' if not 'shipped'
    // - Cannot 'cancel' if 'shipped' or 'delivered' (unless it's a refund flow)

    if (status === 'paid' && order.status !== 'pending') {
        return res.status(400).json({ message: `Order cannot be marked 'paid' from status '${order.status}'`});
    }
    if (status === 'shipped' && order.status !== 'paid') {
        return res.status(400).json({ message: `Order must be 'paid' before it can be 'shipped'. Current status: '${order.status}'`});
    }
    if (status === 'delivered' && order.status !== 'shipped') {
        return res.status(400).json({ message: `Order must be 'shipped' before it can be 'delivered'. Current status: '${order.status}'`});
    }


    order.status = status;
    // Potentially update timestamps like shipped_at, delivered_at if you add those fields
    await order.save();

    // TODO: Notify buyer/seller of status change

    res.status(200).json({ message: 'Order status updated successfully', order });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ message: 'Server error updating order status' });
  }
};

// @desc    Update shipping address for an order (typically by buyer before shipping)
// @route   PUT /api/orders/:id/shipping-address
// @access  Protected (Buyer)
export const updateShippingAddress = async (req, res) => {
    const { shipping_address } = req.body; // Expect a JSON object
    const user_id = req.user.user_id;

    if (!shipping_address || typeof shipping_address !== 'object') {
        return res.status(400).json({ message: 'Valid shipping address (JSON object) is required.' });
    }

    try {
        const order = await Order.findByPk(req.params.id);
        if (!order) {
            return res.status(404).json({ message: 'Order not found.' });
        }
        if (order.buyer_id !== user_id) {
            return res.status(403).json({ message: 'Not authorized to update this order\'s shipping address.' });
        }
        // Allow address update only if order is in 'pending' or 'paid' state (before shipping)
        if (!['pending', 'paid'].includes(order.status)) {
            return res.status(400).json({ message: `Shipping address cannot be updated when order status is '${order.status}'.` });
        }

        order.shipping_address = shipping_address;
        await order.save();

        res.status(200).json({ message: 'Shipping address updated successfully.', order });
    } catch (error) {
        console.error('Error updating shipping address:', error);
        res.status(500).json({ message: 'Server error updating shipping address.' });
    }
};

// Payment related endpoints (e.g., creating a payment intent with Stripe) would go here
// For now, we'll assume payment is handled externally or manually updated to 'paid'.
//
// Example: Placeholder for marking an order as paid (e.g., after webhook from payment gateway)
// This might be an internal service or a protected admin/seller endpoint.
// export const markOrderAsPaid = async (req, res) => {
//   const { payment_intent_id } = req.body;
//   try {
//     const order = await Order.findByPk(req.params.id);
//     if (!order) return res.status(404).json({ message: 'Order not found' });
//     // Authorization: Only seller or admin
//     if (order.seller_id !== req.user.user_id /* && !req.user.isAdmin */) {
//       return res.status(403).json({ message: 'Not authorized' });
//     }
//     if (order.status !== 'pending') {
//       return res.status(400).json({ message: 'Order is not in pending payment status' });
//     }
//     order.status = 'paid';
//     order.payment_intent_id = payment_intent_id || order.payment_intent_id;
//     await order.save();
//     // TODO: Notify buyer and seller
//     res.status(200).json({ message: 'Order marked as paid', order });
//   } catch (error) {
//     console.error('Error marking order as paid:', error);
//     res.status(500).json({ message: 'Server error' });
//   }
// };