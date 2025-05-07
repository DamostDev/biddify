import { DataTypes } from 'sequelize';
import sequelize from '../lib/connectPG.js';

const UserFollow = sequelize.define('UserFollow', {
  follow_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  follower_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users', // Table name
      key: 'user_id',
    },
  },
  followed_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users', // Table name
      key: 'user_id',
    },
  },
  // created_at is handled by Sequelize timestamps options
}, {
  tableName: 'user_follows',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false, // No updated_at column in the SQL schema
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['follower_id', 'followed_id'],
    },
  ],
});

export default UserFollow;