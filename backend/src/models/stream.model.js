import { DataTypes } from 'sequelize';
import sequelize from '../lib/connectPG.js';

const Stream = sequelize.define('Stream', {
  stream_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false, // Assuming a stream must have a user
    references: {
      model: 'users', // Table name
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
    allowNull: true, // Assuming category can be optional
    references: {
      model: 'categories', // Table name
      key: 'category_id',
    },
  },
  start_time: {
    type: DataTypes.DATE, // Sequelize uses DATE for TIMESTAMP WITH TIME ZONE
    defaultValue: DataTypes.NOW,
  },
  end_time: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('scheduled', 'live', 'ended', 'cancelled'),
    allowNull: true, // Or false if status is mandatory
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
    allowNull: true, // Or false if always required
  },
}, {
  tableName: 'streams',
  timestamps: false, // start_time is explicit, no created_at/updated_at in SQL schema
  underscored: true,
});

export default Stream;