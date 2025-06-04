import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url'; // To get __dirname in ESM
import chatRoutes from './chat.route.js';

import {
  createStream,
  getAllStreams,
  getStreamById,
  getMyStreams,
  updateStream,
  deleteStream,
  startStream, // General DB status update
  endStream,   // General DB status update
  goLiveStreamer, // LiveKit specific
  joinLiveStreamViewer, // LiveKit specific
  endLiveStream // LiveKit specific
} from '../controllers/stream.controller.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// --- Multer Setup for Stream Thumbnails ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Assumes stream.route.js is in project_root/src/routes/
// Adjust path.resolve if your directory structure is different
const STREAM_THUMBNAIL_UPLOAD_DIR_RELATIVE = 'public/uploads/streams/';
const STREAM_THUMBNAIL_UPLOAD_DIR_ABSOLUTE = path.resolve(__dirname, '..', '..', STREAM_THUMBNAIL_UPLOAD_DIR_RELATIVE);


// Ensure upload directory exists
if (!fs.existsSync(STREAM_THUMBNAIL_UPLOAD_DIR_ABSOLUTE)){
    fs.mkdirSync(STREAM_THUMBNAIL_UPLOAD_DIR_ABSOLUTE, { recursive: true });
    console.log(`Created directory: ${STREAM_THUMBNAIL_UPLOAD_DIR_ABSOLUTE}`);
} else {
    console.log(`Directory already exists: ${STREAM_THUMBNAIL_UPLOAD_DIR_ABSOLUTE}`);
}

const streamThumbnailStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, STREAM_THUMBNAIL_UPLOAD_DIR_ABSOLUTE); // Use absolute path
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'stream-thumb-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const streamThumbnailFileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Not an image! Please upload only images for thumbnails.'), false);
  }
};

const uploadStreamThumbnail = multer({
  storage: streamThumbnailStorage,
  fileFilter: streamThumbnailFileFilter,
  limits: { fileSize: 1024 * 1024 * 2 } // 2MB limit for thumbnail
});
// --- End Multer Setup ---


// Stream Routes
router.route('/')
  .post(protect, uploadStreamThumbnail.single('thumbnail'), createStream) // 'thumbnail' is field name
  .get(getAllStreams);

router.get('/me', protect, getMyStreams); // Get streams for logged-in user

router.route('/:id')
  .get(getStreamById)
  .put(protect, uploadStreamThumbnail.single('thumbnail'), updateStream)
  .delete(protect, deleteStream);

// Routes for general stream state management (DB updates)
router.post('/:id/start', protect, startStream);
router.post('/:id/end', protect, endStream);

// Routes specifically for LiveKit interaction
router.post('/:id/go-live', protect, goLiveStreamer);
router.get('/:id/join-live', protect, joinLiveStreamViewer); // 'protect' for logged-in viewers, can be optional for guests
router.post('/:id/end-live', protect, endLiveStream);

//stream chat routes
router.use('/:streamId/messages', chatRoutes);
router.route('/:id')
  .get(getStreamById)
  .put(protect, uploadStreamThumbnail.single('thumbnail'), updateStream)
  .delete(protect, deleteStream);



// You might add routes for:
// - Getting stream key (owner only): GET /:id/key
// - Updating viewer counts (from stream server via a secure mechanism)

export default router;