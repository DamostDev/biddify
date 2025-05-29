import { Stream, User, Category, sequelize } from '../models/index.js';
import { Op } from 'sequelize';
import crypto from 'crypto'; // For generating stream keys
import { v4 as uuidv4 } from 'uuid'; // For unique identifiers
import { generateLiveKitToken } from '../lib/livekitService.js';

const getBaseUrl = (req) => `${req.protocol}://${req.get('host')}`;

// Helper to generate a unique stream key
const generateStreamKey = () => {
  return crypto.randomBytes(16).toString('hex');
};

// @desc    Create a new stream
// @route   POST /api/streams
// @access  Protected
export const goLiveStreamer = async (req, res) => {
  console.log("--- [BACKEND] goLiveStreamer - REFETCH & UPDATE STRATEGY ---");
  const stream_id = parseInt(req.params.id);
  const user_id = req.user.user_id;
  console.log(`[BACKEND] stream_id=${stream_id}, user_id=${user_id}`);

  try {
    // Step 1: Initial fetch to check existence and ownership
    let stream = await Stream.findByPk(stream_id, { include: [User] }); // Include User for participantName

    if (!stream) {
      console.log("[BACKEND] Initial fetch: Stream not found (404).");
      return res.status(404).json({ message: "Stream not found." });
    }
    if (stream.user_id !== user_id) {
      console.log("[BACKEND] User not authorized (403).");
      return res.status(403).json({ message: "You are not authorized to start this stream." });
    }
    console.log("[BACKEND] Initial fetch successful. Current DB status:", stream.status, "DB livekitRoomName:", stream.livekitRoomName);

    // Step 2: Determine the new room name and status details
    let roomNameToSet;
    const updates = {};
    let needsSave = false;

    if (!stream.livekitRoomName || stream.status !== 'live') {
      roomNameToSet = `biddify-stream-${stream.stream_id}-${uuidv4().slice(0, 8)}`;
      updates.livekitRoomName = roomNameToSet;
      console.log("[BACKEND] Generated NEW livekitRoomName:", roomNameToSet);
      needsSave = true;
    } else {
      roomNameToSet = stream.livekitRoomName; // Use existing
      console.log("[BACKEND] Using EXISTING livekitRoomName from DB:", roomNameToSet);
    }

    if (stream.status !== 'live') {
      updates.status = 'live';
      updates.startTime = stream.startTime || new Date(); // Set startTime if not already set or if status changes
      console.log("[BACKEND] Setting status to 'live' and startTime to:", updates.startTime);
      needsSave = true;
    } else {
        // If status is already 'live', but startTime was somehow null, set it.
        if (!stream.startTime) {
            updates.startTime = new Date();
            console.log("[BACKEND] Status already 'live', but setting missing startTime to:", updates.startTime);
            needsSave = true;
        }
    }

    // Step 3: Perform the update if changes are needed
    if (needsSave) {
      console.log("[BACKEND] Changes detected. Performing update operation with values:", updates);
      const [numberOfAffectedRows] = await Stream.update(updates, {
        where: { stream_id: stream_id },
        returning: false, // We will re-fetch to get the updated instance
      });

      if (numberOfAffectedRows > 0) {
        console.log(`[BACKEND] Stream.update successful. ${numberOfAffectedRows} row(s) affected.`);
        // Re-fetch the stream to get the absolute latest data, including applied updates
        stream = await Stream.findByPk(stream_id, { include: [User] }); // Re-assign to 'stream'
        if (!stream) {
            console.error("🔴 CRITICAL: Stream not found after successful update!");
            throw new Error("Failed to re-fetch stream after update.");
        }
        console.log("[BACKEND] Stream re-fetched after update. DB livekitRoomName:", stream.livekitRoomName, "DB status:", stream.status);
      } else {
        console.warn("[BACKEND] Stream.update reported 0 affected rows. This might be okay if values were already set, or an issue.");
        // If update reported 0 rows but we expected changes, re-fetch to see current DB state
        stream = await Stream.findByPk(stream_id, { include: [User] });
         if (!stream) {
            console.error("🔴 CRITICAL: Stream not found after 0-row update!");
            throw new Error("Failed to re-fetch stream after 0-row update.");
        }
        console.log("[BACKEND] Stream re-fetched (after 0-row update). DB livekitRoomName:", stream.livekitRoomName, "DB status:", stream.status);
        // Update roomNameToSet if it was supposed to change but didn't save
        if (updates.livekitRoomName && stream.livekitRoomName !== updates.livekitRoomName) {
            console.warn("🔴 WARNING: livekitRoomName was intended to be updated but re-fetch shows it didn't stick. Using intended value for token.");
            roomNameToSet = updates.livekitRoomName; // Use the one we tried to set
        } else {
            roomNameToSet = stream.livekitRoomName; // Use what's actually in DB or on instance
        }
      }
    } else {
        console.log("[BACKEND] No changes deemed necessary for status or livekitRoomName. Proceeding with current values.");
    }

    // Step 4: Ensure roomNameToSet has a value for token generation
    const finalRoomNameForToken = roomNameToSet || stream.livekitRoomName; // Fallback to instance if roomNameToSet is still null
    if (!finalRoomNameForToken) {
        console.error("🔴 CRITICAL: finalRoomNameForToken is STILL null/undefined before token generation!");
        return res.status(500).json({ message: "Internal error: Could not determine room name for token." });
    }

    // Step 5: Generate LiveKit Token
    const participantIdentity = `user-${user_id}-streamer-${stream_id}`;
    const participantName = stream.User ? stream.User.username : `Streamer-${user_id}`;
    const participantMetadata = { role: 'streamer', streamId: stream.stream_id };

    console.log("[BACKEND] Generating token with Room Name:", finalRoomNameForToken, "Identity:", participantIdentity);
    const tokenString = await generateLiveKitToken(
        finalRoomNameForToken,
        participantIdentity, participantName,
        true, true, participantMetadata
    );
    console.log("-----> [BACKEND] Generated LiveKit Token (string):", tokenString ? "OK" : "FAILED/NULL");

    // Step 6: Send Response
    res.json({
        token: tokenString,
        livekitUrl: process.env.LIVEKIT_URL,
        roomName: finalRoomNameForToken,
        streamDetails: stream.toJSON(), // Send the latest fetched/updated stream instance
        participantIdentity
    });
    console.log("--- [BACKEND] goLiveStreamer END (REFETCH & UPDATE STRATEGY) ---");

  } catch (error) {
    console.error("🔴 [BACKEND] Error in goLiveStreamer:", error);
    res.status(500).json({ message: "Failed to start live stream.", error: error.message });
  }
};
export const joinLiveStreamViewer = async (req, res) => {
  console.log("--- [BACKEND] joinLiveStreamViewer START ---");
  const stream_id = parseInt(req.params.id);
  const user_id = req.user?.user_id;
  console.log(`[BACKEND] joinLiveStreamViewer: stream_id=${stream_id}, user_id=${user_id || 'guest'}`);

  try {
      const stream = await Stream.findOne({
          where: { stream_id: stream_id, status: 'live' }, // Crucial: status must be live
          include: [{model: User, attributes: ['username']}]
      });
      console.log("[BACKEND] joinLiveStreamViewer: Found stream in DB:", stream ? stream.toJSON() : "null");

      if (!stream || !stream.livekitRoomName) { // Crucial: livekitRoomName must be set
          console.log("[BACKEND] joinLiveStreamViewer: Live stream not found, not active, or no room name. Stream status:", stream?.status, "Room name:", stream?.livekitRoomName);
          return res.status(404).json({ message: "Live stream not found or not active." });
      }

      const baseIdentity = user_id ? `user-${user_id}` : `guest-${uuidv4()}`;
      const participantIdentity = `${baseIdentity}-viewer-${stream_id}`;
      const participantName = user_id
          ? (await User.findByPk(user_id))?.username || `User-${user_id}`
          : `Guest-${uuidv4().substring(0, 6)}`;
      const participantMetadata = { role: 'viewer', streamId: stream.stream_id };

      const tokenString = await generateLiveKitToken(
          stream.livekitRoomName, // Use room name from the fetched stream
          participantIdentity, participantName,
          false, true, participantMetadata
      );
      console.log("-----> [BACKEND] Generated LiveKit Token for Viewer (string):", tokenString ? "OK" : "FAILED/NULL");

      res.json({
          token: tokenString,
          livekitUrl: process.env.LIVEKIT_URL,
          roomName: stream.livekitRoomName,
          streamDetails: stream.toJSON(),
          participantIdentity
      });
      console.log("--- [BACKEND] joinLiveStreamViewer END (SUCCESS) ---");

  } catch (error) {
      console.error("🔴 [BACKEND] Error in joinLiveStreamViewer:", error);
      // ... (error handling)
       res.status(500).json({ message: "Failed to join live stream.", error: error.message });
  }
};
export const endLiveStream = async (req, res) => {
  const stream_id = parseInt(req.params.id);
  const user_id = req.user.user_id;

  try {
      const stream = await Stream.findByPk(stream_id);
      if (!stream) {
          return res.status(404).json({ message: 'Stream not found' });
      }
      if (stream.user_id !== user_id) {
          return res.status(403).json({ message: 'Not authorized to end this stream' });
      }
      // if (stream.status !== 'live') { // Allow ending even if somehow stuck, but was live
      //     return res.status(400).json({ message: 'Stream is not currently live or already ended.' });
      // }

      stream.status = 'ended';
      stream.end_time = new Date();
      // Consider what to do with livekitRoomName. Clearing it means a new room next time.
      // stream.livekitRoomName = null; // Or keep for record
      await stream.save();

      // Optional: If you want to explicitly delete the room from LiveKit server
      // (rooms are auto-deleted after a period of inactivity anyway)
      // const { RoomServiceClient } = await import('livekit-server-sdk'); // Dynamic import for ESM
      // const roomService = new RoomServiceClient(process.env.LIVEKIT_URL, process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET);
      // if (stream.livekitRoomName) {
      //   try {
      //     await roomService.deleteRoom(stream.livekitRoomName);
      //     console.log(`LiveKit room ${stream.livekitRoomName} deleted.`);
      //   } catch (lkError) {
      //     console.warn(`Could not delete LiveKit room ${stream.livekitRoomName}:`, lkError.message);
      //   }
      // }

      // TODO: Handle ending active auctions associated with this stream (important!)
      // This should be part of your auction logic, perhaps triggered by a stream status change.
      // For now, just log a reminder:
      console.log(`Stream ${stream_id} ended. Ensure active auctions are handled.`);

      res.status(200).json({ message: 'Stream ended successfully.', stream });
  } catch (error) {
      console.error("🔴 Error ending stream:", error);
      res.status(500).json({ message: 'Server error ending stream', error: error.message });
  }
};
export const createStream = async (req, res) => {
  const { title, description, category_id, is_private = false, thumbnail_url_manual } = req.body;
  // 'thumbnail_url_manual' is if user provides a URL directly, otherwise we might handle uploads
  const user_id = req.user.user_id;

  if (!title) {
    return res.status(400).json({ message: 'Stream title is required' });
  }
  if (category_id && !(await Category.findByPk(category_id))) {
    return res.status(400).json({ message: 'Invalid category ID' });
  }

  let thumbnailUrl = thumbnail_url_manual || null;
  if (req.file) { // Assuming 'thumbnail' is the field name for multer upload
    thumbnailUrl = `${getBaseUrl(req)}/uploads/streams/${req.file.filename}`;
  }

  try {
    const stream_key = generateStreamKey(); // Generate a unique stream key

    const stream = await Stream.create({
      user_id,
      title,
      description,
      category_id: category_id || null,
      thumbnail_url: thumbnailUrl,
      status: 'scheduled', // Default status
      is_private,
      stream_key,
      viewer_count: 0,
      max_viewer_count: 0,
      // start_time can be set later when the stream actually starts, or allow scheduling
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
    // If thumbnail was uploaded and DB save failed, delete the uploaded file
    if (req.file && thumbnailUrl && thumbnailUrl.includes(req.file.filename)) {
      fs.unlink(req.file.path, err => {
        if (err) console.error("Error deleting uploaded stream thumbnail on failure:", err);
      });
    }
    if (error.name === 'SequelizeUniqueConstraintError' && error.fields.stream_key) {
        // Extremely rare, but handle if stream_key somehow collides
        return res.status(500).json({ message: 'Could not generate unique stream key, please try again.' });
    }
    res.status(500).json({ message: 'Server error creating stream' });
  }
};

// @desc    Get all streams (e.g., live, scheduled)
// @route   GET /api/streams
// @access  Public
export const getAllStreams = async (req, res) => {
  const { status, categoryId, userId, searchTerm } = req.query;
  let whereClause = {
    is_private: false // By default, only show public streams
  };

  if (status && ['live', 'scheduled', 'ended'].includes(status)) {
    whereClause.status = status;
  } else {
    // Default to showing live and scheduled streams if no specific status is given
    whereClause.status = { [Op.in]: ['live', 'scheduled'] };
  }

  if (categoryId) {
    whereClause.category_id = parseInt(categoryId);
  }

  let userWhereClause = {};
  if (userId) { // If fetching streams for a specific user (public view)
    whereClause.user_id = parseInt(userId);
  }

  if (searchTerm) {
      whereClause[Op.or] = [
          { title: { [Op.iLike]: `%${searchTerm}%` } },
          { description: { [Op.iLike]: `%${searchTerm}%` } }
      ];
  }


  try {
    const streams = await Stream.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          attributes: ['user_id', 'username', 'profile_picture_url'],
          where: userWhereClause // Apply user filter here if needed (e.g. searching by username)
        },
        { model: Category, attributes: ['category_id', 'name'] },
      ],
      order: [
        // Prioritize live streams, then scheduled, then by start time or creation time
        sequelize.literal("CASE status WHEN 'live' THEN 1 WHEN 'scheduled' THEN 2 ELSE 3 END"),
        ['start_time', 'DESC'],
        ['created_at', 'DESC']
      ],
      // Add pagination later
    });
    res.status(200).json(streams);
  } catch (error) {
    console.error('Error fetching streams:', error);
    res.status(500).json({ message: 'Server error while fetching streams' });
  }
};

// @desc    Get a single stream by ID
// @route   GET /api/streams/:id
// @access  Public
export const getStreamById = async (req, res) => {
  try {
    const stream = await Stream.findByPk(req.params.id, {
      include: [
        { model: User, attributes: ['user_id', 'username', 'profile_picture_url', 'seller_rating'] },
        { model: Category, attributes: ['category_id', 'name'] },
        // { model: Auction, as: 'auctions', where: { status: 'active' }, required: false } // Example: get active auctions for this stream
      ],
    });

    if (!stream) {
      return res.status(404).json({ message: 'Stream not found' });
    }
    // Optional: if stream is private, only allow owner or invited users
    if (stream.is_private && (!req.user || stream.user_id !== req.user.user_id)) {
        // Implement logic for invited users if needed
        // For now, only owner can see private stream details via direct ID lookup if not live
        // If it were live, a different mechanism might grant access (e.g. invite link with token)
        // return res.status(403).json({ message: 'Access denied to private stream' });
    }

    res.status(200).json(stream);
  } catch (error) {
    console.error('Error fetching stream by ID:', error);
    res.status(500).json({ message: 'Server error while fetching stream' });
  }
};


// @desc    Get streams by logged-in user
// @route   GET /api/streams/me
// @access  Protected
export const getMyStreams = async (req, res) => {
    try {
      const streams = await Stream.findAll({
        where: { user_id: req.user.user_id }, // Get all streams for the owner, regardless of status/privacy
        include: [
          { model: Category, attributes: ['category_id', 'name'] },
        ],
        order: [['created_at', 'DESC']],
      });
      res.status(200).json(streams);
    } catch (error) {
      console.error('Error fetching user streams:', error);
      res.status(500).json({ message: 'Server error' });
    }
};


// @desc    Update a stream (details, status, etc.)
// @route   PUT /api/streams/:id
// @access  Protected
export const updateStream = async (req, res) => {
  const { title, description, category_id, is_private, status, thumbnail_url_manual } = req.body;
  // status changes like 'live', 'ended', 'cancelled' might have dedicated endpoints for clarity

  try {
    const stream = await Stream.findByPk(req.params.id);

    if (!stream) {
      return res.status(404).json({ message: 'Stream not found' });
    }

    // Authorization: Check if logged-in user owns the stream
    if (stream.user_id !== req.user.user_id) {
      return res.status(403).json({ message: 'User not authorized to update this stream' });
    }

    // Handle thumbnail update
    let newThumbnailUrl = stream.thumbnail_url;
    if (req.file) { // New thumbnail uploaded
        // Delete old thumbnail if it exists and is different
        if (stream.thumbnail_url && stream.thumbnail_url !== thumbnail_url_manual) {
            const oldFilename = path.basename(stream.thumbnail_url);
            const oldFilePath = path.join('public/uploads/streams/', oldFilename);
            if (fs.existsSync(oldFilePath)) {
                fs.unlinkSync(oldFilePath);
            }
        }
        newThumbnailUrl = `${getBaseUrl(req)}/uploads/streams/${req.file.filename}`;
    } else if (thumbnail_url_manual !== undefined) { // Manual URL provided (could be clearing it or setting new)
        // If clearing and old one was an upload, delete the file
        if (!thumbnail_url_manual && stream.thumbnail_url && stream.thumbnail_url.startsWith(getBaseUrl(req))) {
             const oldFilename = path.basename(stream.thumbnail_url);
             const oldFilePath = path.join('public/uploads/streams/', oldFilename);
             if (fs.existsSync(oldFilePath)) {
                 fs.unlinkSync(oldFilePath);
             }
        }
        newThumbnailUrl = thumbnail_url_manual || null;
    }


    stream.title = title || stream.title;
    stream.description = description !== undefined ? description : stream.description;
    stream.category_id = category_id !== undefined ? (category_id || null) : stream.category_id;
    stream.is_private = is_private !== undefined ? is_private : stream.is_private;
    stream.thumbnail_url = newThumbnailUrl;

    // More controlled status changes:
    if (status && ['scheduled', 'live', 'ended', 'cancelled'].includes(status)) {
        if (status === 'live' && stream.status !== 'live') {
            stream.start_time = new Date(); // Set start time when going live
            // Potentially reset viewer counts if re-going live, or manage them differently
        } else if (status === 'ended' && stream.status !== 'ended') {
            stream.end_time = new Date(); // Set end time
        }
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
    // If new thumbnail was uploaded and DB save failed, delete the uploaded file
    if (req.file && newThumbnailUrl && newThumbnailUrl.includes(req.file.filename)) {
      fs.unlink(req.file.path, err => {
        if (err) console.error("Error deleting uploaded stream thumbnail on update failure:", err);
      });
    }
    res.status(500).json({ message: 'Server error updating stream' });
  }
};


// @desc    Delete a stream
// @route   DELETE /api/streams/:id
// @access  Protected
export const deleteStream = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const stream = await Stream.findByPk(req.params.id, { transaction: t});

    if (!stream) {
      await t.rollback();
      return res.status(404).json({ message: 'Stream not found' });
    }

    if (stream.user_id !== req.user.user_id) {
      await t.rollback();
      return res.status(403).json({ message: 'User not authorized to delete this stream' });
    }

    // Add checks: cannot delete if stream is 'live' or has 'active' auctions?
    if (stream.status === 'live') {
        await t.rollback();
        return res.status(400).json({ message: 'Cannot delete a live stream. End it first.'});
    }
    // const activeAuctions = await Auction.count({ where: { stream_id: stream.stream_id, status: 'active' }, transaction: t });
    // if (activeAuctions > 0) {
    //     await t.rollback();
    //     return res.status(400).json({ message: 'Cannot delete stream with active auctions.' });
    // }

    // Delete thumbnail from server if it was an upload
    if (stream.thumbnail_url && stream.thumbnail_url.startsWith(getBaseUrl(req))) {
        const filename = path.basename(stream.thumbnail_url);
        const filePath = path.join('public/uploads/streams/', filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }

    await stream.destroy({ transaction: t });
    await t.commit();

    res.status(200).json({ message: 'Stream deleted successfully' });
  } catch (error) {
    await t.rollback();
    console.error('Error deleting stream:', error);
     if (error.name === 'SequelizeForeignKeyConstraintError') {
        return res.status(400).json({ message: 'Cannot delete stream. It is associated with other items (e.g., auctions).' });
    }
    res.status(500).json({ message: 'Server error deleting stream' });
  }
};

// --- Specific Stream State Change Endpoints ---

// @desc    Start a scheduled stream (change status to 'live')
// @route   POST /api/streams/:id/start
// @access  Protected
export const startStream = async (req, res) => {
    try {
        const stream = await Stream.findByPk(req.params.id);
        if (!stream) return res.status(404).json({ message: 'Stream not found' });
        if (stream.user_id !== req.user.user_id) return res.status(403).json({ message: 'Not authorized' });
        if (stream.status === 'live') return res.status(400).json({ message: 'Stream is already live' });
        if (stream.status === 'ended' || stream.status === 'cancelled') return res.status(400).json({ message: 'Stream has ended or been cancelled' });

        stream.status = 'live';
        stream.start_time = new Date();
        // Reset viewer_count if it's a re-start? Or accumulate? For now, just set to live.
        // stream.viewer_count = 0;
        // stream.max_viewer_count = 0;
        await stream.save();
        res.status(200).json({ message: 'Stream started', stream });
    } catch (error) {
        console.error("Error starting stream:", error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    End a live stream (change status to 'ended')
// @route   POST /api/streams/:id/end
// @access  Protected
export const endStream = async (req, res) => {
    try {
        const stream = await Stream.findByPk(req.params.id);
        if (!stream) return res.status(404).json({ message: 'Stream not found' });
        if (stream.user_id !== req.user.user_id) return res.status(403).json({ message: 'Not authorized' });
        if (stream.status !== 'live') return res.status(400).json({ message: 'Stream is not live' });

        stream.status = 'ended';
        stream.end_time = new Date();
        await stream.save();
        // TODO: Handle ending active auctions associated with this stream? Set them to 'unsold' or a specific "ended_with_stream" status.
        res.status(200).json({ message: 'Stream ended', stream });
    } catch (error) {
        console.error("Error ending stream:", error);
        res.status(500).json({ message: 'Server error' });
    }
};