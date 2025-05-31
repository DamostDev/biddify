// models/index.js
import sequelize from '../lib/connectPG.js';
import User from './user.model.js';
import Category from './category.model.js';
import Stream from './stream.model.js';
import Product from './product.model.js';
import Auction from './auction.model.js';
import Bid from './bid.model.js';
import Order from './order.model.js';
import UserFollow from './userFollow.model.js';
import ProductImage from './productImage.model.js';
import ChatMessage from './chatMessage.model.js';


// --- Define model associations ---

// Category self-referencing for parent/subcategories
Category.hasMany(Category, {
  as: 'subcategories',
  foreignKey: 'parent_category_id',
  sourceKey: 'category_id',
});
Category.belongsTo(Category, {
  as: 'parentCategory',
  foreignKey: 'parent_category_id',
  targetKey: 'category_id',
});

// User associations
User.hasMany(Stream, { foreignKey: 'user_id' });
User.hasMany(Product, { foreignKey: 'user_id' });
User.hasMany(Auction, { as: 'wonAuctions', foreignKey: 'winner_id' });
User.hasMany(Bid, { foreignKey: 'user_id' });
User.hasMany(Order, { as: 'purchases', foreignKey: 'buyer_id' });
User.hasMany(Order, { as: 'sales', foreignKey: 'seller_id' });

// Stream associations
Stream.belongsTo(User, { foreignKey: 'user_id' });
Stream.belongsTo(Category, { foreignKey: 'category_id' });
Stream.hasMany(Auction, { foreignKey: 'stream_id' });

// Product associations
Product.belongsTo(User, { foreignKey: 'user_id' });
Product.belongsTo(Category, { foreignKey: 'category_id' });
Product.hasMany(Auction, { foreignKey: 'product_id' }); // A product can be auctioned multiple times

// Auction associations
Auction.belongsTo(Product, { foreignKey: 'product_id' });
Auction.belongsTo(Stream, { foreignKey: 'stream_id', allowNull: true });
Auction.belongsTo(User, { as: 'winner', foreignKey: 'winner_id', allowNull: true });
Auction.hasMany(Bid, { foreignKey: 'auction_id' });
Auction.hasOne(Order, { foreignKey: 'auction_id', allowNull: true }); // An auction might not result in an order (e.g., unsold)

// Bid associations
Bid.belongsTo(Auction, { foreignKey: 'auction_id' });
Bid.belongsTo(User, { foreignKey: 'user_id' });

// Order associations
Order.belongsTo(User, { as: 'buyer', foreignKey: 'buyer_id' });
Order.belongsTo(User, { as: 'seller', foreignKey: 'seller_id' });
Order.belongsTo(Auction, { foreignKey: 'auction_id', allowNull: true });

// UserFollow (Many-to-Many for User follows User)
User.belongsToMany(User, {
  as: 'Following', // Users that this user is following
  through: UserFollow,
  foreignKey: 'follower_id', // In UserFollow table, this links to the User doing the following
  otherKey: 'followed_id',   // In UserFollow table, this links to the User being followed
});
User.belongsToMany(User, {
  as: 'Followers', // Users that are following this user
  through: UserFollow,
  foreignKey: 'followed_id', // In UserFollow table, this links to the User being followed
  otherKey: 'follower_id',   // In UserFollow table, this links to the User doing the following
});

// Optional: Explicit associations for UserFollow model if you query it directly
UserFollow.belongsTo(User, { as: 'follower', foreignKey: 'follower_id' });
UserFollow.belongsTo(User, { as: 'followed', foreignKey: 'followed_id' });

Product.hasMany(ProductImage, {
  foreignKey: 'product_id',
  as: 'images', // You can eager load these as product.images
  onDelete: 'CASCADE', // If a product is deleted, delete its images too
});
ProductImage.belongsTo(Product, { foreignKey: 'product_id' });

// ChatMessage associations
ChatMessage.belongsTo(User, { foreignKey: 'user_id' });
User.hasMany(ChatMessage, { foreignKey: 'user_id' });

ChatMessage.belongsTo(Stream, { foreignKey: 'stream_id' });
Stream.hasMany(ChatMessage, { foreignKey: 'stream_id' });


const syncDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL connection established');

    // Sync all models
    // Use { alter: true } carefully in production, prefer migrations
    await sequelize.sync({ alter: true });
    console.log('✅ All models synchronized (alter mode)');
    
  } catch (error) {
    console.error('❌ Database synchronization failed:', error);
    process.exit(1);
  }
};

syncDatabase();

export {
  User,
  ProductImage,
  Category,
  Stream,
  Product,
  Auction,
  Bid,
  Order,
  UserFollow,
  ChatMessage,
  sequelize // Export sequelize instance if needed elsewhere
};