// backend/src/controllers/stream.controller.js
import { Stream, User, Category, sequelize } from '../models/index.js';
import { Op } from 'sequelize';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { generateLiveKitToken } from '../lib/livekitService.js';
import { RoomServiceClient } from 'livekit-server-sdk';
import fs from 'fs';
import path from 'path';

// --->>> CRITICAL DIAGNOSTIC LOGS (Execute ONCE on module load/server start) <<<---
console.log('---------------------------------------------------------------------');
console.log('--- [StreamController Global Scope] MODULE LOADING START ---');
console.log('---------------------------------------------------------------------');
console.log('[StreamController Global Scope] Reading process.env.LIVEKIT_URL:', process.env.LIVEKIT_URL);
console.log('[StreamController Global Scope] Reading process.env.LIVEKIT_API_KEY:', process.env.LIVEKIT_API_KEY ? `Exists (Length: ${process.env.LIVEKIT_API_KEY.length})` : 'MISSING or EMPTY!');
console.log('[StreamController Global Scope] Reading process.env.LIVEKIT_API_SECRET:', process.env.LIVEKIT_API_SECRET ? `Exists (Length: ${process.env.LIVEKIT_API_SECRET.length})` : 'MISSING or EMPTY!');

let roomService = null; 

// --- CORRECTED SECTION ---
// Declare livekitApiUrl here, before it's used in the if condition
const livekitApiUrl = process.env.LIVEKIT_URL ? process.env.LIVEKIT_URL.replace(/^wss?:\/\//, 'https://') : null;
console.log('[StreamController Global Scope] Derived LiveKit API URL for RoomServiceClient:', livekitApiUrl);

if (process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET && livekitApiUrl) {
  try {
    console.log(`[StreamController Global Scope] Attempting to initialize RoomServiceClient with API URL: "${livekitApiUrl}"`);
    roomService = new RoomServiceClient(
      livekitApiUrl, // Use the derived HTTP/S URL
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET
    );
    console.log('[StreamController Global Scope] ✅ LiveKit RoomServiceClient initialized successfully.');
  } catch (e) {
    console.error('🔴 [StreamController Global Scope] Error initializing RoomServiceClient with URL "' + livekitApiUrl + '":', e.message, e);
    roomService = null; 
  }
} else {
  console.warn('⚠️ [StreamController Global Scope] RoomServiceClient NOT initialized. Prerequisites not met:');
  if (!livekitApiUrl) console.warn('  - LIVEKIT_URL is missing, empty, or could not be parsed correctly.'); // Updated check
  if (!process.env.LIVEKIT_API_KEY) console.warn('  - LIVEKIT_API_KEY is missing or empty.');
  if (!process.env.LIVEKIT_API_SECRET) console.warn('  - LIVEKIT_API_SECRET is missing or empty.');
}
// --- END CORRECTED SECTION ---

console.log('---------------------------------------------------------------------');
console.log('--- [StreamController Global Scope] MODULE LOADING END ---');
console.log('---------------------------------------------------------------------');
// --- END CRITICAL DIAGNOSTIC LOGS ---

const getBaseUrl = (req) => `${req.protocol}://${req.get('host')}`;

const generateStreamKey = () => {
  return crypto.randomBytes(16).toString('hex');
};

// ... (rest of the file remains the same)
export const createStream = async (req, res) => {
  const { title, description, category_id, is_private = false, thumbnail_url_manual } = req.body;
  const user_id = req.user.user_id;

  if (!title) {
    return res.status(400).json({ message: 'Stream title is required' });
  }
  if (category_id) {
      const categoryExists = await Category.findByPk(category_id);
      if (!categoryExists) {
        return res.status(400).json({ message: 'Invalid category ID' });
      }
  }

  let thumbnailUrl = thumbnail_url_manual || null;
  if (req.file) {
    thumbnailUrl = `${getBaseUrl(req)}/uploads/streams/${req.file.filename}`;
  }

  try {
    const stream_key = generateStreamKey(); 

    const stream = await Stream.create({
      user_id,
      title,
      description,
      category_id: category_id || null,
      thumbnail_url: thumbnailUrl,
      status: 'scheduled', 
      is_private,
      stream_key,
      viewer_count: 0,
      max_viewer_count: 0,
    });

    const newStreamWithDetails = await Stream.findByPk(stream.stream_id, {
        include: [
            { model: User, attributes: ['user_id', 'username', 'profile_picture_url'] },
            { model: Category, attributes: ['category_id', 'name'] },
        ]
    });
    res.status(201).json(newStreamWithDetails);
  } catch (error) {
    console.error('Error creating stream:', error);
    if (req.file && thumbnailUrl && thumbnailUrl.includes(req.file.filename)) {
      if (fs && fs.unlink) {
        fs.unlink(req.file.path, err => {
            if (err) console.error("Error deleting uploaded stream thumbnail on failure:", err);
        });
      }
    }
    if (error.name === 'SequelizeUniqueConstraintError' && error.fields && (error.fields.stream_key || error.fields.livekit_room_name) ) {
        return res.status(500).json({ message: 'Could not generate unique stream identifier, please try again.' });
    }
    res.status(500).json({ message: 'Server error creating stream' });
  }
};

export const getAllStreams = async (req, res) => {
  const { status, categoryId, userId, searchTerm, limit = 10 } = req.query;
  let whereClause = { is_private: false };
  let requestedStatus = status;

  if (status && ['live', 'scheduled', 'ended'].includes(status)) {
    whereClause.status = status;
  } else {
    whereClause.status = { [Op.in]: ['live', 'scheduled'] };
    if (!status) requestedStatus = 'live_or_scheduled'; 
  }
  if (categoryId) whereClause.category_id = parseInt(categoryId);
  if (userId) whereClause.user_id = parseInt(userId);
  if (searchTerm) {
      whereClause[Op.or] = [
          { title: { [Op.iLike]: `%${searchTerm}%` } },
          { description: { [Op.iLike]: `%${searchTerm}%` } }
      ];
  }

  try {
    const streamsFromDB = await Stream.findAll({
      where: whereClause,
      include: [
        { model: User, attributes: ['user_id', 'username', 'profile_picture_url'] },
        { model: Category, attributes: ['category_id', 'name'] },
      ],
      order: [
        sequelize.literal("CASE status WHEN 'live' THEN 1 WHEN 'scheduled' THEN 2 ELSE 3 END"),
        ['start_time', 'DESC'],
        ['created_at', 'DESC']
      ],
      limit: parseInt(limit)
    });

    let streamsToReturn = streamsFromDB.map(s => s.get({ plain: true }));

    if (roomService) {
      console.log('[getAllStreams DIAGNOSTIC] roomService object IS available before participant count loop.');
      try {
        const roomsList = await roomService.listRooms([]); 
        console.log(`[getAllStreams DIAGNOSTIC] roomService.listRooms([]) successful. Server reported ${roomsList.length} rooms.`);
      } catch (testCallError) {
        console.error(`🔴 [getAllStreams DIAGNOSTIC] roomService.listRooms([]) FAILED: ${testCallError.message}`, testCallError);
      }
    } else {
      console.warn('[getAllStreams DIAGNOSTIC] roomService is NULL or not initialized before participant count loop. Skipping LiveKit calls.');
    }

    if (roomService && (requestedStatus === 'live' || requestedStatus === 'live_or_scheduled')) {
      const participantCountPromises = streamsToReturn
        .filter(s => s.status === 'live' && s.livekitRoomName)
        .map(async (stream) => {
          try {
            const participants = await roomService.listParticipants(stream.livekitRoomName);
            return { ...stream, viewer_count: participants.length };
          } catch (lkError) {
            console.warn(`[getAllStreams] LiveKit Error on listParticipants for room ${stream.livekitRoomName}: ${lkError.message}. Using DB count ${stream.viewer_count}.`);
            return stream; 
          }
        });
      
      const updatedStreamsWithCounts = await Promise.all(participantCountPromises);
      
      streamsToReturn = streamsToReturn.map(originalStream => {
        const updatedVersion = updatedStreamsWithCounts.find(us => us.stream_id === originalStream.stream_id && us.status === 'live' && typeof us.viewer_count === 'number');
        return updatedVersion || originalStream;
      });
    }
    res.status(200).json(streamsToReturn);
  } catch (error) {
    console.error('Error fetching streams:', error);
    res.status(500).json({ message: 'Server error while fetching streams' });
  }
};

export const getStreamById = async (req, res) => {
  try {
    const streamFromDB = await Stream.findByPk(req.params.id, {
      include: [
        { model: User, attributes: ['user_id', 'username', 'profile_picture_url', 'seller_rating'] },
        { model: Category, attributes: ['category_id', 'name'] },
      ],
    });
    if (!streamFromDB) return res.status(404).json({ message: 'Stream not found' });

    let streamToReturn = streamFromDB.get({ plain: true });

    if (roomService && streamToReturn.status === 'live' && streamToReturn.livekitRoomName) {
        try {
            const participants = await roomService.listParticipants(streamToReturn.livekitRoomName);
            streamToReturn.viewer_count = participants.length;
        } catch (lkError) {
            console.warn(`[getStreamById] LiveKit Error for room ${streamToReturn.livekitRoomName}: ${lkError.message}.`);
        }
    }
    res.status(200).json(streamToReturn);
  } catch (error) {
    console.error('Error fetching stream by ID:', error);
    res.status(500).json({ message: 'Server error while fetching stream' });
  }
};

export const goLiveStreamer = async (req, res) => {
  const stream_id = parseInt(req.params.id);
  const user_id = req.user.user_id;
  try {
    let stream = await Stream.findByPk(stream_id, { include: [User] }); 
    if (!stream) return res.status(404).json({ message: "Stream not found." });
    if (stream.user_id !== user_id) return res.status(403).json({ message: "Not authorized." });

    const updates = {};
    let needsSave = false;
    if (!stream.livekitRoomName) {
      updates.livekitRoomName = `biddify-stream-${stream.stream_id}-${uuidv4().slice(0, 8)}`;
      needsSave = true;
    }
    if (stream.status !== 'live') {
      updates.status = 'live';
      updates.start_time = stream.start_time || new Date(); 
      needsSave = true;
    } else if (!stream.start_time) {
        updates.start_time = new Date();
        needsSave = true;
    }
    if (needsSave) await stream.update(updates);

    const finalRoomNameForToken = stream.livekitRoomName;
    if (!finalRoomNameForToken) return res.status(500).json({ message: "Room name error." });

    const participantIdentity = `user-${user_id}-streamer-${stream_id}`;
    const participantName = stream.User ? stream.User.username : `Streamer-${user_id}`;
    const participantMetadata = { role: 'streamer', streamId: stream.stream_id };

    const tokenString = await generateLiveKitToken(
        finalRoomNameForToken, participantIdentity, participantName,
        true, true, true, participantMetadata
    );
    res.json({
        token: tokenString, livekitUrl: process.env.LIVEKIT_URL, roomName: finalRoomNameForToken,
        streamDetails: stream.toJSON(), participantIdentity
    });
  } catch (error) {
    console.error("🔴 Error in goLiveStreamer:", error);
    res.status(500).json({ message: "Failed to start live stream.", error: error.message });
  }
};

export const joinLiveStreamViewer = async (req, res) => {
  const stream_id = parseInt(req.params.id);
  const user_id = req.user?.user_id;
  try {
      const stream = await Stream.findOne({
          where: { stream_id: stream_id, status: 'live' }, 
          include: [{model: User, attributes: ['username']}]
      });
      if (!stream || !stream.livekitRoomName) { 
          return res.status(404).json({ message: "Live stream not found/active." });
      }
      const baseIdentity = user_id ? `user-${user_id}` : `guest-${uuidv4().slice(0,8)}`;      
      const participantIdentity = `${baseIdentity}-viewer-${stream_id}`;
      const participantName = user_id ? (await User.findByPk(user_id))?.username || `User-${user_id}` : `Guest-${uuidv4().substring(0, 6)}`;
      const participantMetadata = { role: 'viewer', streamId: stream.stream_id };
      const tokenString = await generateLiveKitToken(
          stream.livekitRoomName, participantIdentity, participantName,
          false, true, true, participantMetadata
      );
      res.json({
          token: tokenString, livekitUrl: process.env.LIVEKIT_URL, roomName: stream.livekitRoomName,
          streamDetails: stream.toJSON(), participantIdentity
      });
  } catch (error) {
      console.error("🔴 Error in joinLiveStreamViewer:", error);
       res.status(500).json({ message: "Failed to join.", error: error.message });
  }
};

export const endLiveStream = async (req, res) => {
  const stream_id = parseInt(req.params.id);
  const user_id = req.user.user_id;
  try {
      const stream = await Stream.findByPk(stream_id);
      if (!stream) return res.status(404).json({ message: 'Stream not found' });
      if (stream.user_id !== user_id) return res.status(403).json({ message: 'Not authorized' });
      const oldRoomName = stream.livekitRoomName;
      stream.status = 'ended';
      stream.end_time = new Date();
      await stream.save();
      if (roomService && oldRoomName) {
        try {
          await roomService.deleteRoom(oldRoomName);
          console.log(`LiveKit room ${oldRoomName} deleted.`);
        } catch (lkError) { console.warn(`Could not delete LiveKit room ${oldRoomName}:`, lkError.message); }
      }
      res.status(200).json({ message: 'Stream ended successfully.', stream });
  } catch (error) {
      console.error("🔴 Error ending stream:", error);
      res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getMyStreams = async (req, res) => {
    try {
      const streams = await Stream.findAll({
        where: { user_id: req.user.user_id },
        include: [{ model: Category, attributes: ['category_id', 'name'] }],
        order: [['created_at', 'DESC']],
      });
      res.status(200).json(streams);
    } catch (error) { 
        console.error('Error fetching user streams:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const updateStream = async (req, res) => {
  const { title, description, category_id, is_private, status, thumbnail_url_manual } = req.body;
  try {
    const stream = await Stream.findByPk(req.params.id);
    if (!stream) return res.status(404).json({ message: 'Stream not found' });
    if (stream.user_id !== req.user.user_id) return res.status(403).json({ message: 'Not authorized' });
    let newThumbnailUrl = stream.thumbnail_url;
    if (req.file) {
        if (stream.thumbnail_url && stream.thumbnail_url !== thumbnail_url_manual && stream.thumbnail_url.startsWith(getBaseUrl(req))) {
            try { 
                const oldUrl = new URL(stream.thumbnail_url); 
                const oldFilename = path.basename(oldUrl.pathname);
                const oldFilePath = path.join('public/uploads/streams/', oldFilename);
                if (fs.existsSync(oldFilePath)) fs.unlinkSync(oldFilePath); 
            } catch(e){ console.warn("Error parsing/deleting old thumbnail URL during update:", e.message); }
        }
        newThumbnailUrl = `${getBaseUrl(req)}/uploads/streams/${req.file.filename}`;
    } else if (thumbnail_url_manual !== undefined) { 
        if (!thumbnail_url_manual && stream.thumbnail_url && stream.thumbnail_url.startsWith(getBaseUrl(req))) {
             try{ 
                const oldUrl = new URL(stream.thumbnail_url);
                const oldFilename = path.basename(oldUrl.pathname);
                const oldFilePath = path.join('public/uploads/streams/', oldFilename);
                if (fs.existsSync(oldFilePath)) fs.unlinkSync(oldFilePath); 
            } catch(e){ console.warn("Error parsing/deleting old thumbnail URL for clearing:", e.message); }
        }
        newThumbnailUrl = thumbnail_url_manual || null;
    }

    stream.title = title !== undefined ? title : stream.title;
    stream.description = description !== undefined ? description : stream.description;
    stream.category_id = category_id !== undefined ? (category_id || null) : stream.category_id;
    stream.is_private = is_private !== undefined ? is_private : stream.is_private;
    stream.thumbnail_url = newThumbnailUrl;

    if (status && ['scheduled', 'live', 'ended', 'cancelled'].includes(status)) {
        if (status === 'live' && stream.status !== 'live') stream.start_time = new Date();
        else if (status === 'ended' && stream.status !== 'ended') stream.end_time = new Date();
        stream.status = status;
    }
    await stream.save();
    const updatedStreamWithDetails = await Stream.findByPk(stream.stream_id, {
        include: [
            { model: User, attributes: ['user_id', 'username', 'profile_picture_url'] },
            { model: Category, attributes: ['category_id', 'name'] },
        ]
    });
    res.status(200).json(updatedStreamWithDetails);
  } catch (error) {
    console.error('Error updating stream:', error);
    if (req.file && newThumbnailUrl && newThumbnailUrl.includes(req.file.filename)) { 
      if (fs && fs.unlink) fs.unlink(req.file.path, err => { if (err) console.error("Error deleting temp thumbnail on update failure:", err); });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteStream = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const stream = await Stream.findByPk(req.params.id, { transaction: t});
    if (!stream) { await t.rollback(); return res.status(404).json({ message: 'Stream not found' }); }
    if (stream.user_id !== req.user.user_id) { await t.rollback(); return res.status(403).json({ message: 'Not authorized' }); }
    if (stream.status === 'live') { await t.rollback(); return res.status(400).json({ message: 'Cannot delete live stream.'}); }
    
    if (stream.thumbnail_url && stream.thumbnail_url.startsWith(getBaseUrl(req))) { 
        try{ 
            const urlObject = new URL(stream.thumbnail_url); 
            const filename = path.basename(urlObject.pathname);
            const filePath = path.join('public/uploads/streams/', filename);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath); 
        } catch(e){
            console.warn("Error parsing/deleting thumbnail URL during stream delete. URL was:", stream.thumbnail_url, e.message);
        }
    }
    await stream.destroy({ transaction: t }); 
    await t.commit();
    res.status(200).json({ message: 'Stream deleted' });
  } catch (error) {
    await t.rollback();
    console.error('Error deleting stream:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const startStream = async (req, res) => { 
    try {
        const stream = await Stream.findByPk(req.params.id);
        if (!stream) return res.status(404).json({ message: 'Stream not found' });
        if (stream.user_id !== req.user.user_id) return res.status(403).json({ message: 'Not authorized' });
        if (stream.status === 'live') return res.status(400).json({ message: 'Already live' });
        if (stream.status === 'ended' || stream.status === 'cancelled') return res.status(400).json({ message: 'Stream ended/cancelled' });
        stream.status = 'live';
        stream.start_time = new Date(); 
        await stream.save();
        res.status(200).json({ message: 'Stream live (DB)', stream });
    } catch (error) { 
        console.error("Error starting stream (DB status):", error);
        res.status(500).json({ message: 'Server error' }); 
    }
};

export const endStream = async (req, res) => { 
    try {
        const stream = await Stream.findByPk(req.params.id);
        if (!stream) return res.status(404).json({ message: 'Stream not found' });
        if (stream.user_id !== req.user.user_id) return res.status(403).json({ message: 'Not authorized' });
        stream.status = 'ended';
        stream.end_time = new Date();
        await stream.save();
        res.status(200).json({ message: 'Stream ended (DB)', stream });
    } catch (error) { 
        console.error("Error ending stream (DB status):", error);
        res.status(500).json({ message: 'Server error' }); 
    }
};
export const getProductsForStream = async (req, res) => {
  const { streamId } = req.params;
  try {
      const stream = await Stream.findByPk(streamId);
      if (!stream) return res.status(404).json({ message: 'Stream not found' });
      const products = await stream.getStreamCatalog({
          // Add any include options for products here, e.g., images, category
          include: [
              { model: ProductImage, as: 'images', where: { is_primary: true }, required: false },
              { model: Category, attributes: ['category_id', 'name'] }
          ],
          joinTableAttributes: [] // Exclude attributes from StreamProduct table in this response
      });
      res.status(200).json(products);
  } catch (error) {
      // ... error handling ...
  }
};
