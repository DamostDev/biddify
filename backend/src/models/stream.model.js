// backend/src/models/stream.model.js
import { DataTypes, Sequelize as SequelizeCore } from 'sequelize';
import sequelize from '../lib/connectPG.js';

const Stream = sequelize.define('Stream', {
  // All your regular attributes (stream_id, user_id, title, etc.)
  stream_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'user_id',
    },
  },
  title: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  thumbnail_url: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  category_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'categories',
      key: 'category_id',
    },
  },
  start_time: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  end_time: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('scheduled', 'live', 'ended', 'cancelled'),
    allowNull: false,
    defaultValue: 'scheduled',
  },
  viewer_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  max_viewer_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  is_private: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  stream_key: {
    type: DataTypes.STRING(100),
    unique: true,
    allowNull: true,
  },
  livekitRoomName: {
    type: DataTypes.STRING(255),
    allowNull: true,
    unique: true,
  }
  // NO created_at or updated_at here for now
}, {
  tableName: 'streams',
  timestamps: true,      // <--- SET BACK TO TRUE
  underscored: true,
  createdAt: 'created_at', // Good to be explicit
  updatedAt: 'updated_at', // Good to be explicit
});

export default Stream;