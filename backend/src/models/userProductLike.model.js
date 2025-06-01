// backend/src/models/userProductLike.model.js
import { DataTypes } from 'sequelize';
import sequelize from '../lib/connectPG.js';

const UserProductLike = sequelize.define('UserProductLike', {
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
  product_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'products', // Table name
      key: 'product_id',
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  liked_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'user_product_likes',
  timestamps: true,
  createdAt: 'liked_at',
  updatedAt: false,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'product_id'], // A user can like a product only once
    },
  ],
});

export default UserProductLike;