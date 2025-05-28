import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

import {
  createStream,
  getAllStreams,
  getStreamById,
  getMyStreams,
  updateStream,
  deleteStream,
  startStream,
  endStream,
  goLiveStreamer,
  joinLiveStreamViewer,
  endLiveStream
} from '../controllers/stream.controller.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// --- Multer Setup for Stream Thumbnails ---
const STREAM_THUMBNAIL_UPLOAD_DIR = 'public/uploads/streams/';

// Ensure upload directory exists
if (!fs.existsSync(STREAM_THUMBNAIL_UPLOAD_DIR)){
    fs.mkdirSync(STREAM_THUMBNAIL_UPLOAD_DIR, { recursive: true });
    console.log(`Created directory: ${STREAM_THUMBNAIL_UPLOAD_DIR}`);
} else {
    console.log(`Directory already exists: ${STREAM_THUMBNAIL_UPLOAD_DIR}`);
}

const streamThumbnailStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, STREAM_THUMBNAIL_UPLOAD_DIR);
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

router.post('/:id/start', protect, startStream);
router.post('/:id/end', protect, endStream);
router.post('/:id/go-live', protect, goLiveStreamer);
router.get('/:id/join-live', protect, joinLiveStreamViewer);
router.post('/:id/end-live', protect, endLiveStream);

// You might add routes for:
// - Getting stream key (owner only): GET /:id/key
// - Updating viewer counts (from stream server via a secure mechanism)

export default router;