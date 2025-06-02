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
  product_id: { // Changed from stream_id to product_id
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'products', // References the 'products' table
      key: 'product_id',  // References the 'product_id' key in 'products'
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  viewed_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  duration_ms: { // How long the user viewed the product page/details
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  // percentage_watched field removed as it's less typical for product views
}, {
  tableName: 'user_product_views',
  timestamps: true,
  createdAt: 'viewed_at', // 'viewed_at' will also serve as the 'createdAt' timestamp
  updatedAt: false,       // No 'updatedAt' timestamp
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'product_id', 'viewed_at'], // Unique constraint
      name: 'user_product_view_unique' // Optional: custom name for the constraint
    },
    // Individual non-unique indexes can be kept if specific queries benefit from them
    // { fields: ['user_id'] },
    // { fields: ['product_id'] },
    // { fields: ['viewed_at'] }, // Indexing viewed_at alone might be useful for time-based queries
  ],
});

export default UserProductView;