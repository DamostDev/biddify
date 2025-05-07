import { DataTypes } from 'sequelize';
import sequelize from '../lib/connectPG.js';

const Order = sequelize.define('Order', {
  order_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  buyer_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users', // Table name
      key: 'user_id',
    },
  },
  seller_id: { // Though product implies a seller, this might be useful for direct queries
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users', // Table name
      key: 'user_id',
    },
  },
  auction_id: {
    type: DataTypes.INTEGER,
    allowNull: true, // An order might not always come from an auction (e.g. direct buy)
    references: {
      model: 'auctions', // Table name
      key: 'auction_id',
    },
  },
  total_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  shipping_cost: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  tax_amount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  status: {
    type: DataTypes.ENUM('pending', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded'),
    allowNull: true, // Or false if status is mandatory
  },
  payment_intent_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  shipping_address: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  // created_at and updated_at are handled by Sequelize timestamps options
}, {
  tableName: 'orders',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true,
});

export default Order;