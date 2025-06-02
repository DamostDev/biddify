import { DataTypes } from 'sequelize';
import sequelize from '../lib/connectPG.js';

const Auction = sequelize.define('Auction', {
  auction_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  product_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'products', // Table name
      key: 'product_id',
    },
  },
  stream_id: {
    type: DataTypes.INTEGER,
    allowNull: true, // Can be null if auction is not tied to a live stream
    references: {
      model: 'streams', // Table name
      key: 'stream_id',
    },
  },
  starting_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  current_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  reserve_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  start_time: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  end_time: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  duration_seconds: {
    type: DataTypes.INTEGER,
    defaultValue: 60,
  },
  status: {
    type: DataTypes.ENUM('pending', 'active', 'sold', 'unsold', 'cancelled'),
    allowNull: true,
  },
  winner_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users', // Table name
      key: 'user_id',
    },
  },
  bid_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },

}, {
  tableName: 'auctions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true,
});

export default Auction;