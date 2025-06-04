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

import UserProductLike from './userProductLike.model.js';
import UserProductView from './userProductView.model.js';
import UserStreamLike from './userStreamLike.model.js';
import UserStreamView from './userStreamView.model.js';


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
Product.belongsTo(User, { as: 'Owner', foreignKey: 'user_id' });
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

User.belongsToMany(Product, {
  through: UserProductLike,
  foreignKey: 'user_id',
  otherKey: 'product_id',
  as: 'LikedProducts', // User.getLikedProducts(), User.addLikedProduct()
});
Product.belongsToMany(User, {
  through: UserProductLike,
  foreignKey: 'product_id',
  otherKey: 'user_id',
  as: 'ProductLikers', // Product.getProductLikers(), Product.addProductLiker()
});
// Optional: Direct associations to the join table if you query it directly
UserProductLike.belongsTo(User, { foreignKey: 'user_id' });
UserProductLike.belongsTo(Product, { foreignKey: 'product_id' });

// User-Product Views (Many-to-Many)
User.belongsToMany(Product, {
  through: UserProductView,
  foreignKey: 'user_id',
  otherKey: 'product_id',
  as: 'ViewedProducts',
});
Product.belongsToMany(User, {
  through: UserProductView,
  foreignKey: 'product_id',
  otherKey: 'user_id',
  as: 'ProductViewers',
});
UserProductView.belongsTo(User, { foreignKey: 'user_id' });
UserProductView.belongsTo(Product, { foreignKey: 'product_id' });

// User-Stream Likes (Many-to-Many)
User.belongsToMany(Stream, {
  through: UserStreamLike,
  foreignKey: 'user_id',
  otherKey: 'stream_id',
  as: 'LikedStreams',
});
Stream.belongsToMany(User, {
  through: UserStreamLike,
  foreignKey: 'stream_id',
  otherKey: 'user_id',
  as: 'StreamLikers',
});
UserStreamLike.belongsTo(User, { foreignKey: 'user_id' });
UserStreamLike.belongsTo(Stream, { foreignKey: 'stream_id' });

// User-Stream Views (Many-to-Many)
User.belongsToMany(Stream, {
  through: UserStreamView,
  foreignKey: 'user_id',
  otherKey: 'stream_id',
  as: 'ViewedStreams',
});
Stream.belongsToMany(User, {
  through: UserStreamView,
  foreignKey: 'stream_id',
  otherKey: 'user_id',
  as: 'StreamViewers',
});
UserStreamView.belongsTo(User, { foreignKey: 'user_id' });
UserStreamView.belongsTo(Stream, { foreignKey: 'stream_id' });

export const syncDatabase = async () => {
  try {
    // await sequelize.authenticate(); // Authentication is done in index.js now
    // console.log('✅ PostgreSQL connection established'); // Moved to index.js

    await sequelize.sync({ alter: true }); // Use { alter: true } carefully in production
    console.log('✅ All models synchronized (alter mode)');
    
  } catch (error) {
    console.error('❌ Database synchronization failed:', error);
    // process.exit(1); // Let the main index.js handle process exit
    throw error; // Re-throw to be caught by startServer
  }
};

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
  sequelize,
  UserProductLike,
  UserProductView,
  UserStreamLike,
  UserStreamView
};