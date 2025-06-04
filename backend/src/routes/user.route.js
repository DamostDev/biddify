// src/routes/user.route.js
import express from 'express';
import {
  followUser,
  unfollowUser,
  getFollowing,
  getFollowers,
  checkFollowingStatus,
  
} from '../controllers/userFollow.controller.js';

// Import new user controllers
import {
  getUserProfile,
  updateUserProfile,
  changePassword,
  getDashboardSummary
} from '../controllers/user.controller.js'; // Assuming you named it user.controller.js

import { protect } from '../middleware/authMiddleware.js';
import { uploadAvatar } from '../middleware/uploadMiddleware.js'; // Import multer middleware

const router = express.Router();

// --- Profile Routes ---
router.get('/profile', protect, getUserProfile); // Get current logged-in user's profile
router.put(
  '/profile',
  protect,
  uploadAvatar.single('profile_picture'), // 'profile_picture' is the field name from FormData
  updateUserProfile
);
router.put('/change-password', protect, changePassword);

// --- Follow Routes (existing) ---
router.post('/:userIdToFollow/follow', protect, followUser);
router.post('/:userIdToUnfollow/unfollow', protect, unfollowUser);
router.get('/:userId/following', getFollowing);
router.get('/:userId/followers', getFollowers);
router.get('/:userId/is-following', protect, checkFollowingStatus);
router.get('/dashboard-summary', protect, getDashboardSummary);

// Optional: Get public profile of another user
// router.get('/:userId/public-profile', getPublicUserProfile); // You'd need a new controller for this

export default router;