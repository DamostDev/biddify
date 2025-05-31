// backend/src/controllers/chat.controller.js
import { ChatMessage, Stream, User } from '../models/index.js';
import { Op } from 'sequelize';

// @desc    Post a new chat message to a stream
// @route   POST /api/streams/:streamId/messages
// @access  Protected
export const postChatMessage = async (req, res) => {
  const { streamId } = req.params;
  const { text, client_timestamp } = req.body; // client_timestamp for potential ordering/reference
  const user_id = req.user.user_id; // From protect middleware
  const username_at_send_time = req.user.username;
  const avatar_url_at_send_time = req.user.profile_picture_url;

  if (!text || text.trim() === '') {
    return res.status(400).json({ message: 'Message text cannot be empty' });
  }

  try {
    const stream = await Stream.findByPk(streamId);
    if (!stream) {
      return res.status(404).json({ message: 'Stream not found' });
    }
    // Optional: Check if stream is active, etc.
    if (stream.status !== 'live') {
       return res.status(400).json({ message: 'Cannot post messages to a non-live stream' });
     }

    const newMessage = await ChatMessage.create({
      stream_id: parseInt(streamId),
      user_id,
      username_at_send_time,
      avatar_url_at_send_time,
      message_text: text,
      sent_at: client_timestamp ? new Date(client_timestamp) : new Date(), // Use client ts or server
    });

    // We don't need to send the message back via HTTP response if LiveKit handles real-time
    // But it's good for confirmation or if client wants the DB-generated ID
    const messageWithUser = await ChatMessage.findByPk(newMessage.message_id, {
      include: [{ model: User, attributes: ['user_id', 'username', 'profile_picture_url'] }]
    });

    res.status(201).json(messageWithUser);
  } catch (error) {
    console.error('Error posting chat message:', error);
    res.status(500).json({ message: 'Server error while posting message' });
  }
};

// @desc    Get chat messages for a stream
// @route   GET /api/streams/:streamId/messages
// @access  Public (or Protected if you want only participants to see history)
export const getChatMessagesForStream = async (req, res) => {
  const { streamId } = req.params;
  const { limit = 50, before_message_id } = req.query; // For pagination

  try {
    const stream = await Stream.findByPk(streamId);
    if (!stream) {
      return res.status(404).json({ message: 'Stream not found' });
    }

    let whereClause = { stream_id: parseInt(streamId) };
    if (before_message_id) {
      whereClause.message_id = { [Op.lt]: parseInt(before_message_id) };
    }

    const messages = await ChatMessage.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          attributes: ['user_id', 'username', 'profile_picture_url'], // Get sender info
        },
      ],
      order: [['sent_at', 'ASC']], // Oldest first for history, or DESC for latest
      limit: parseInt(limit),
    });

    res.status(200).json(messages.reverse()); // Reverse to show newest at bottom of a typical load
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    res.status(500).json({ message: 'Server error while fetching messages' });
  }
};