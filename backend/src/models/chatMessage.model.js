// backend/src/models/chatMessage.model.js
import { DataTypes } from 'sequelize';
import sequelize from '../lib/connectPG.js';

const ChatMessage = sequelize.define('ChatMessage', {
  message_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  stream_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'streams', // Table name
      key: 'stream_id',
    },
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users', // Table name
      key: 'user_id',
    },
  },
  username_at_send_time: { // Store username for historical display
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  avatar_url_at_send_time: { // Store avatar for historical display
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  message_text: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  sent_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'chat_messages',
  timestamps: true, // Use Sequelize's timestamps
  createdAt: 'sent_at', // Map createdAt to sent_at
  updatedAt: false,    // No separate updatedAt needed for chat messages
  underscored: true,
});

export default ChatMessage;