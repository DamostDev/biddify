// backend/src/routes/chat.route.js
import express from 'express';
import { postChatMessage, getChatMessagesForStream } from '../controllers/chat.controller.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router({ mergeParams: true }); // mergeParams to get :streamId

router.route('/')
  .post(protect, postChatMessage)
  .get(getChatMessagesForStream); // Potentially add protect here too

export default router;