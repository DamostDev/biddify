import express from 'express';
import {
  followUser,
  unfollowUser,
  getFollowing,
  getFollowers,
  checkFollowingStatus
} from '../controllers/userFollow.controller.js'; // Note: controller name might be better as user.controller.js if it has more user actions
import { protect } from '../middleware/authMiddleware.js';
// Import other user controllers if you have them, e.g., getUserProfile, updateUserProfile

const router = express.Router();

// User Profile routes (example)
// router.get('/:userId/profile', getUserProfile);
// router.put('/profile', protect, updateUserProfile);


// Follow routes - actions are on the user being followed/unfollowed
router.post('/:userIdToFollow/follow', protect, followUser);
router.post('/:userIdToUnfollow/unfollow', protect, unfollowUser);

// Get lists
router.get('/:userId/following', getFollowing); // Public
router.get('/:userId/followers', getFollowers); // Public

// Check status
router.get('/:userId/is-following', protect, checkFollowingStatus);


export default router;