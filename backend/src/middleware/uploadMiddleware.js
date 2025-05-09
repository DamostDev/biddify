import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Relative to project root where 'public' folder is
const AVATAR_UPLOAD_DIR_RELATIVE = 'public/uploads/avatars/';
// Absolute path for fs operations
const AVATAR_UPLOAD_DIR_ABSOLUTE = path.resolve(__dirname, '..', '..', AVATAR_UPLOAD_DIR_RELATIVE); // Assumes middleware is in 'src/middleware'

if (!fs.existsSync(AVATAR_UPLOAD_DIR_ABSOLUTE)){
    fs.mkdirSync(AVATAR_UPLOAD_DIR_ABSOLUTE, { recursive: true });
    console.log(`Created directory: ${AVATAR_UPLOAD_DIR_ABSOLUTE}`);
}

const avatarStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, AVATAR_UPLOAD_DIR_ABSOLUTE); // Multer needs absolute path for destination
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = req.user.user_id + '-' + Date.now(); // Simplified unique name
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
  }
});
// ... (avatarFileFilter and export uploadAvatar as before)
const avatarFileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Not an image! Please upload only images.'), false);
    }
  };

  export const uploadAvatar = multer({
    storage: avatarStorage,
    fileFilter: avatarFileFilter,
    limits: { fileSize: 1024 * 1024 * 2 } // 2MB limit per file
  });