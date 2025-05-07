import { DataTypes } from 'sequelize';
import sequelize from '../lib/connectPG.js';

const Bid = sequelize.define('Bid', {
  bid_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  auction_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'auctions', // Table name
      key: 'auction_id',
    },
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users', // Table name
      key: 'user_id',
    },
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  bid_time: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  is_winning: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  is_cancelled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName: 'bids',
  timestamps: false, // bid_time is explicit, no general created_at/updated_at in SQL schema
  underscored: true,
});

export default Bid;