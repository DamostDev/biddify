import { DataTypes } from 'sequelize';
import sequelize from '../lib/connectPG.js';

const StreamProduct = sequelize.define('StreamProduct', { // Model name 'StreamProduct'
  stream_product_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  stream_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'streams',
      key: 'stream_id',
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  product_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'products',
      key: 'product_id',
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  added_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  }
}, {
  tableName: 'stream_products', // Table name in DB
  timestamps: true,
  createdAt: 'added_at',
  updatedAt: 'updated_at',
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['stream_id', 'product_id'],
      name: 'stream_product_unique_association'
    }
  ]
});

export default StreamProduct;