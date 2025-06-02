// backend/src/models/userStreamView.model.js
import { DataTypes } from 'sequelize';
import sequelize from '../lib/connectPG.js';

const UserStreamView = sequelize.define('UserStreamView', {
  view_id: {
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
  viewed_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  duration_ms: { // Optional: How long the user viewed the stream
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  percentage_watched: { // Optional: If you can track this
    type: DataTypes.DECIMAL(5, 4), // e.g., 0.7500 for 75%
    allowNull: true,
    validate: {
      min: 0,
      max: 1,
    }
  }
}, {
  tableName: 'user_stream_views',
  timestamps: true,
  createdAt: 'viewed_at', // 'viewed_at' will also serve as the 'createdAt' timestamp
  updatedAt: false,       // No 'updatedAt' timestamp
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'stream_id', 'viewed_at'], // Added unique constraint
      name: 'user_stream_view_unique' // Optional: custom name for the constraint
    },
    { fields: ['user_id'] }, // Keep for individual lookups if needed
    { fields: ['stream_id'] }, // Keep for individual lookups if needed
    // { fields: ['viewed_at'] }, // Indexing viewed_at alone might be useful for time-based queries
  ],
});

export default UserStreamView;