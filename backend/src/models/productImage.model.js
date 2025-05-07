import { DataTypes } from 'sequelize';
import sequelize from '../lib/connectPG.js';

const ProductImage = sequelize.define('ProductImage', {
  image_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  product_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'products', // Name of the products table
      key: 'product_id',
    },
  },
  image_url: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      isUrl: true,
    },
  },
  alt_text: { // Good for SEO and accessibility
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  is_primary: { // Optional: to mark one image as the main display image
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  // created_at will be handled by Sequelize timestamps
}, {
  tableName: 'product_images',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false, // Or true if you want to track updates to image records
  underscored: true,
});

export default ProductImage;