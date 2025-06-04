// backend/src/controllers/user.controller.js
import { User, Order, Product, Stream, Auction, sequelize } from '../models/index.js'; // <<< MAKE SURE Order, Product, Stream, Auction ARE IMPORTED
import { Op } from 'sequelize';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Define __dirname for ES Modules (if not already done or if this is a separate context)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getBaseUrl = (req) => `${req.protocol}://${req.get('host')}`;
const AVATAR_UPLOAD_DIR_RELATIVE_TO_PROJECT_ROOT = 'public/uploads/avatars/';
const AVATAR_UPLOAD_DIR_ABSOLUTE = path.resolve(__dirname, '..', '..', AVATAR_UPLOAD_DIR_RELATIVE_TO_PROJECT_ROOT);

if (!fs.existsSync(AVATAR_UPLOAD_DIR_ABSOLUTE)) {
  try {
    fs.mkdirSync(AVATAR_UPLOAD_DIR_ABSOLUTE, { recursive: true });
    console.log(`Created directory: ${AVATAR_UPLOAD_DIR_ABSOLUTE}`);
  } catch (err) {
    console.error(`Error creating directory ${AVATAR_UPLOAD_DIR_ABSOLUTE}:`, err);
  }
}


export const getUserProfile = async (req, res) => {
  // ... (your existing code)
  if (req.user) {
    res.status(200).json(req.user);
  } else {
    res.status(404).json({ message: 'User not found' });
  }
};

export const updateUserProfile = async (req, res) => {
  // ... (your existing code)
    try {
      if (!req.user || !req.user.user_id) {
          if (req.file?.path && fs.existsSync(req.file.path)) { fs.unlinkSync(req.file.path); }
          return res.status(401).json({ message: 'User not authenticated or user ID missing.' });
      }
  
      const user = await User.findByPk(req.user.user_id);
  
      if (!user) {
        if (req.file?.path && fs.existsSync(req.file.path)) { fs.unlinkSync(req.file.path); }
        return res.status(404).json({ message: 'User not found in database.' });
      }
  
      const { username = user.username, full_name = user.full_name, bio = user.bio } = req.body;
  
      if (username && username !== user.username) {
        const existingUser = await User.findOne({ where: { username: username } });
        if (existingUser && existingUser.user_id !== user.user_id) {
          if (req.file?.path && fs.existsSync(req.file.path)) { fs.unlinkSync(req.file.path); }
          return res.status(400).json({ message: 'Username already taken' });
        }
        user.username = username;
      }
  
      user.full_name = full_name;
      user.bio = bio;
  
      if (req.file) {
        const newImageRelativePathForURL = `uploads/avatars/${req.file.filename}`;
        const newImageUrl = `${getBaseUrl(req)}/${newImageRelativePathForURL}`;
  
        if (user.profile_picture_url) {
          try {
             const oldUrl = new URL(user.profile_picture_url);
            const oldImageFilename = path.basename(oldUrl.pathname);
            const oldImageAbsolutePath = path.join(AVATAR_UPLOAD_DIR_ABSOLUTE, oldImageFilename);
  
            if (fs.existsSync(oldImageAbsolutePath) && oldImageFilename !== req.file.filename) {
              fs.unlink(oldImageAbsolutePath, (err) => {
                if (err) console.error("Error deleting old avatar file:", oldImageAbsolutePath, err);
                else console.log("Old avatar file deleted:", oldImageAbsolutePath);
              });
            }
          } catch (urlError) {
              console.error("Error processing old profile picture URL:", user.profile_picture_url, urlError);
          }
        }
        user.profile_picture_url = newImageUrl;
      }
  
      await user.save();
  
      const updatedUser = await User.findByPk(user.user_id);
      res.status(200).json({ message: 'Profile updated successfully', user: updatedUser });
  
    } catch (error) {
      console.error('---!!! UPDATE PROFILE SEVERE ERROR !!!---:', error);
       if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlink(req.file.path, (errUnlink) => {
          if (errUnlink) console.error("Error deleting newly uploaded avatar on general update failure (inside catch):", errUnlink);
        });
      }
      if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({ message: error.errors ? error.errors.map(e => e.message).join(', ') : error.message });
      }
      res.status(500).json({ message: 'Server error updating profile. Please check server logs.' });
    }
};

export const changePassword = async (req, res) => {
  // ... (your existing code)
  const { current_password, new_password } = req.body;

  if (!current_password || !new_password) {
    return res.status(400).json({ message: 'Current password and new password are required' });
  }
  if (new_password.length < 8) {
    return res.status(400).json({ message: 'New password must be at least 8 characters long' });
  }

  try {
    const user = await User.scope('withPassword').findByPk(req.user.user_id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await user.comparePassword(current_password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect current password' });
    }

    user.password_hash = new_password; // Hook will hash this
    await user.save();

    res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change Password Error:', error);
    res.status(500).json({ message: 'Server error changing password' });
  }
};

export const getDashboardSummary = async (req, res) => {
  const userId = req.user.user_id;

  try {
    const totalSalesResult = await Order.findOne({ // Using Order model
      where: {
        seller_id: userId,
        status: { [Op.in]: ['paid', 'shipped', 'delivered'] }
      },
      attributes: [[sequelize.fn('SUM', sequelize.col('total_amount')), 'totalSalesValue']],
      raw: true,
    });
    const totalSales = parseFloat(totalSalesResult?.totalSalesValue || 0);

    const totalOrders = await Order.count({ // Using Order model
      where: { seller_id: userId }
    });

    const activeListings = await Product.count({ // Using Product model
      where: { user_id: userId, is_active: true }
    });

    const upcomingStreamsCount = await Stream.count({ // Using Stream model
        where: { user_id: userId, status: 'scheduled' }
    });

    const recentSales = await Order.findAll({ // Using Order model
      where: { seller_id: userId },
      limit: 3,
      order: [['created_at', 'DESC']],
      // Corrected include for recentSales to get Product title via Auction
      include: [{
        model: Auction, // Order belongsTo Auction
        attributes: ['auction_id'],
        include: [{
            model: Product, // Auction belongsTo Product
            attributes: ['title']
        }]
      }],
      attributes: ['order_id', 'total_amount', 'created_at', 'status']
    });

    const recentProducts = await Product.findAll({ // Using Product model
        where: { user_id: userId },
        limit: 3,
        order: [['created_at', 'DESC']],
        attributes: ['product_id', 'title', 'created_at', 'is_active']
    });

    res.status(200).json({
      totalSales,
      totalOrders,
      activeListings,
      upcomingStreamsCount,
      recentSales: recentSales.map(sale => ({
        id: `sale-${sale.order_id}`,
        type: 'sale',
        description: `Sold: ${sale.Auction?.Product?.title || 'Item (Details N/A)'}`,
        time: sale.created_at,
        amount: sale.total_amount,
        status: sale.status
      })),
      recentProducts: recentProducts.map(product => ({
        id: `prod-${product.product_id}`,
        type: product.is_active ? 'listing' : 'draft',
        description: `${product.is_active ? 'Listed' : 'Drafted'}: ${product.title}`,
        time: product.created_at
      }))
    });

  } catch (error) {
    console.error("Error fetching dashboard summary:", error);
    res.status(500).json({ message: "Failed to fetch dashboard summary." });
  }
};