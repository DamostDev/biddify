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
  createdAt: 'viewed_at',
  updatedAt: false,
  underscored: true,
  indexes: [
    { fields: ['user_id'] },
    { fields: ['stream_id'] },
  ],
});

export default UserStreamView;