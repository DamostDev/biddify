import { DataTypes } from 'sequelize';
import sequelize from '../lib/connectPG.js';

const Product = sequelize.define('Product', {
  product_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false, // Assuming a product must have a seller (user)
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
  category_id: {
    type: DataTypes.INTEGER,
    allowNull: true, // Assuming category can be optional
    references: {
      model: 'categories', // Table name
      key: 'category_id',
    },
  },
  condition: {
    type: DataTypes.ENUM('new', 'like_new', 'good', 'fair', 'poor'),
    allowNull: true,
  },
  original_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  // created_at and updated_at are handled by Sequelize timestamps options
}, {
  tableName: 'products',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true,
});

export default Product;