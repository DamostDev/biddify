// src/controllers/user.controller.js
import { User } from '../models/index.js';
import bcrypt from 'bcrypt'; // Keep for changePassword if in the same file
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url'; // Needed for __dirname in ES Modules

// Define __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to get base URL for constructing image URLs
const getBaseUrl = (req) => `${req.protocol}://${req.get('host')}`;

// Define the relative path from the project root to the avatars upload directory
// Assuming 'public' is at the root of your project and this controller is in 'src/controllers'
const AVATAR_UPLOAD_DIR_RELATIVE_TO_PROJECT_ROOT = 'public/uploads/avatars/';
// Define the absolute path for fs operations (like deleting files)
// This goes up one level from 'src/controllers' to 'src', then up another to project root, then to 'public/...'
const AVATAR_UPLOAD_DIR_ABSOLUTE = path.resolve(__dirname, '..', '..', AVATAR_UPLOAD_DIR_RELATIVE_TO_PROJECT_ROOT);


// Ensure upload directory exists (can also be done at server start-up)
if (!fs.existsSync(AVATAR_UPLOAD_DIR_ABSOLUTE)) {
  try {
    fs.mkdirSync(AVATAR_UPLOAD_DIR_ABSOLUTE, { recursive: true });
    console.log(`Created directory: ${AVATAR_UPLOAD_DIR_ABSOLUTE}`);
  } catch (err) {
    console.error(`Error creating directory ${AVATAR_UPLOAD_DIR_ABSOLUTE}:`, err);
  }
}

// ... (getUserProfile and changePassword can remain as previously defined) ...
export const getUserProfile = async (req, res) => {
  if (req.user) {
    res.status(200).json(req.user);
  } else {
    res.status(404).json({ message: 'User not found' });
  }
};


export const updateUserProfile = async (req, res) => {
    try {
      // --- Debugging: Log body right after multer ---
      console.log("Received body after multer:", JSON.stringify(req.body, null, 2));
      console.log("Received file after multer:", req.file);
      // --- End Debugging ---
  
  
      if (!req.user || !req.user.user_id) {
          if (req.file?.path && fs.existsSync(req.file.path)) { fs.unlinkSync(req.file.path); }
          return res.status(401).json({ message: 'User not authenticated or user ID missing.' });
      }
  
      const user = await User.findByPk(req.user.user_id);
  
      if (!user) {
        if (req.file?.path && fs.existsSync(req.file.path)) { fs.unlinkSync(req.file.path); }
        return res.status(404).json({ message: 'User not found in database.' });
      }
  
      // --- Destructure AFTER checking req.body ---
      // If req.body is guaranteed by multer, we can destructure.
      // Provide default values if fields might be missing but multer worked.
      const { username = user.username, full_name = user.full_name, bio = user.bio } = req.body;
  
      // --- Username Update Logic ---
      if (username && username !== user.username) {
        const existingUser = await User.findOne({ where: { username: username } });
        if (existingUser && existingUser.user_id !== user.user_id) {
          if (req.file?.path && fs.existsSync(req.file.path)) { fs.unlinkSync(req.file.path); }
          return res.status(400).json({ message: 'Username already taken' });
        }
        user.username = username;
      }
  
      // --- Other Text Fields Update ---
      // Now we update directly using the destructured values (or their defaults if not provided in req.body)
      // We only update if the value actually changed to potentially avoid unnecessary DB writes.
      // Or simply assign them - Sequelize might optimize if value hasn't changed.
      // Let's assign directly for simplicity, assuming '' or null are valid values to set.
      user.full_name = full_name;
      user.bio = bio;
  
  
      // --- Profile Picture Update Logic (remains the same) ---
      if (req.file) {
        // ... (logic as before) ...
         console.log("New profile picture uploaded on backend:", req.file);
        const newImageRelativePathForURL = `uploads/avatars/${req.file.filename}`;
        const newImageUrl = `${getBaseUrl(req)}/${newImageRelativePathForURL}`;
  
        if (user.profile_picture_url) {
          try {
            // ... (delete old file logic as before) ...
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
  
      // --- Save the user ---
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