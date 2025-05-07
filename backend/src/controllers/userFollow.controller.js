import { User, UserFollow, sequelize } from '../models/index.js';
import { Op } from 'sequelize';

// @desc    Follow a user
// @route   POST /api/users/:userIdToFollow/follow
// @access  Protected
export const followUser = async (req, res) => {
  const follower_id = req.user.user_id; // Logged-in user
  const followed_id = parseInt(req.params.userIdToFollow);

  if (isNaN(followed_id)) {
      return res.status(400).json({ message: 'Invalid user ID to follow.' });
  }

  if (follower_id === followed_id) {
    return res.status(400).json({ message: 'You cannot follow yourself' });
  }

  try {
    const userToFollow = await User.findByPk(followed_id);
    if (!userToFollow) {
      return res.status(404).json({ message: 'User to follow not found' });
    }

    const existingFollow = await UserFollow.findOne({
      where: { follower_id, followed_id },
    });

    if (existingFollow) {
      return res.status(400).json({ message: 'You are already following this user' });
    }

    await UserFollow.create({ follower_id, followed_id });

    // Optional: Increment follower/following counts on User model (denormalization)
    // await User.increment('following_count', { by: 1, where: { user_id: follower_id } });
    // await User.increment('followers_count', { by: 1, where: { user_id: followed_id } });

    res.status(201).json({ message: `Successfully followed ${userToFollow.username}` });
  } catch (error) {
    console.error('Error following user:', error);
    if (error.name === 'SequelizeUniqueConstraintError') { // Should be caught by findOne above, but as a fallback
        return res.status(400).json({ message: 'You are already following this user (concurrent request).' });
    }
    res.status(500).json({ message: 'Server error while following user' });
  }
};

// @desc    Unfollow a user
// @route   POST /api/users/:userIdToUnfollow/unfollow
// @access  Protected
export const unfollowUser = async (req, res) => {
  const follower_id = req.user.user_id;
  const followed_id = parseInt(req.params.userIdToUnfollow);

  if (isNaN(followed_id)) {
      return res.status(400).json({ message: 'Invalid user ID to unfollow.' });
  }

  try {
    const userToUnfollow = await User.findByPk(followed_id);
    if (!userToUnfollow) {
      // Even if user doesn't exist, the follow record might. Proceed to delete.
      // No, better to check first for consistency.
      return res.status(404).json({ message: 'User to unfollow not found' });
    }

    const followRecord = await UserFollow.findOne({
      where: { follower_id, followed_id },
    });

    if (!followRecord) {
      return res.status(400).json({ message: 'You are not following this user' });
    }

    await followRecord.destroy();

    // Optional: Decrement follower/following counts
    // await User.decrement('following_count', { by: 1, where: { user_id: follower_id } });
    // await User.decrement('followers_count', { by: 1, where: { user_id: followed_id } });

    res.status(200).json({ message: `Successfully unfollowed ${userToUnfollow.username}` });
  } catch (error) {
    console.error('Error unfollowing user:', error);
    res.status(500).json({ message: 'Server error while unfollowing user' });
  }
};

// @desc    Get users that a specific user is following
// @route   GET /api/users/:userId/following
// @access  Public
export const getFollowing = async (req, res) => {
  const user_id = parseInt(req.params.userId);
   if (isNaN(user_id)) {
      return res.status(400).json({ message: 'Invalid user ID.' });
  }

  try {
    const user = await User.findByPk(user_id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    // Using the 'Following' alias defined in User model associations
    const following = await user.getFollowing({
        attributes: ['user_id', 'username', 'profile_picture_url', 'full_name'], // Select fields for followed users
        joinTableAttributes: [] // Exclude attributes from the UserFollow join table
    });

    res.status(200).json(following);
  } catch (error) {
    console.error('Error fetching following list:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get followers of a specific user
// @route   GET /api/users/:userId/followers
// @access  Public
export const getFollowers = async (req, res) => {
  const user_id = parseInt(req.params.userId);
   if (isNaN(user_id)) {
      return res.status(400).json({ message: 'Invalid user ID.' });
  }

  try {
    const user = await User.findByPk(user_id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    // Using the 'Followers' alias defined in User model associations
    const followers = await user.getFollowers({
        attributes: ['user_id', 'username', 'profile_picture_url', 'full_name'], // Select fields for follower users
        joinTableAttributes: []
    });

    res.status(200).json(followers);
  } catch (error) {
    console.error('Error fetching followers list:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Check if logged-in user is following another user
// @route   GET /api/users/:userId/is-following
// @access  Protected
export const checkFollowingStatus = async (req, res) => {
    const follower_id = req.user.user_id;
    const followed_id = parseInt(req.params.userId);

    if (isNaN(followed_id)) {
      return res.status(400).json({ message: 'Invalid user ID.' });
    }
    if (follower_id === followed_id) {
        return res.json({ isFollowing: false, message: "Cannot follow self." }); // Or true if you define "following self" differently
    }

    try {
        const isFollowing = await UserFollow.findOne({
            where: { follower_id, followed_id }
        });
        res.status(200).json({ isFollowing: !!isFollowing });
    } catch (error) {
        console.error('Error checking following status:', error);
        res.status(500).json({ message: 'Server error.' });
    }
};