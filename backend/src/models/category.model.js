import { DataTypes } from 'sequelize';
import sequelize from '../lib/connectPG.js';

const Category = sequelize.define('Category', {
  category_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  parent_category_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'categories', // Table name
      key: 'category_id',
    },
  },

}, {
  tableName: 'categories',
  timestamps: false, // Assuming no created_at/updated_at in the SQL for this table
  underscored: true,
});

export default Category;