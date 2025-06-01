// backend/src/models/userProductView.model.js
import { DataTypes } from 'sequelize';
import sequelize from '../lib/connectPG.js';

const UserProductView = sequelize.define('UserProductView', {
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
  viewed_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  duration_ms: { // Optional: How long the user viewed the product page
    type: DataTypes.INTEGER,
    allowNull: true,
  },
}, {
  tableName: 'user_product_views',
  timestamps: true,
  createdAt: 'viewed_at',
  updatedAt: false,
  underscored: true,
  indexes: [
    // You might not want a unique index here if a user can view the same product multiple times
    // and you want to record each instance. If you only want the latest view,
    // you'd handle that logic in your application or use an upsert.
    // For now, let's assume multiple distinct view records are allowed.
    { fields: ['user_id'] },
    { fields: ['product_id'] },
  ],
});

export default UserProductView;