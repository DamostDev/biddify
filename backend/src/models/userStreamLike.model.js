// backend/src/models/userStreamLike.model.js
import { DataTypes } from 'sequelize';
import sequelize from '../lib/connectPG.js';

const UserStreamLike = sequelize.define('UserStreamLike', {
  like_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users', // Table name
      key: 'user_id',
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  stream_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'streams', // Table name
      key: 'stream_id',
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  liked_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'user_stream_likes',
  timestamps: true,
  createdAt: 'liked_at',
  updatedAt: false,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'stream_id'], // A user can like a stream only once
    },
  ],
});

export default UserStreamLike;