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
import StreamProduct from './streamProduct.model.js'; 

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
User.hasMany(Product, { foreignKey: 'user_id' }); // This is for product owner
User.hasMany(Auction, { as: 'wonAuctions', foreignKey: 'winner_id' });
User.hasMany(Bid, { foreignKey: 'user_id' });
User.hasMany(Order, { as: 'purchases', foreignKey: 'buyer_id' });
User.hasMany(Order, { as: 'sales', foreignKey: 'seller_id' });

// Stream associations
Stream.belongsTo(User, { foreignKey: 'user_id' });
Stream.belongsTo(Category, { foreignKey: 'category_id' });
Stream.hasMany(Auction, { foreignKey: 'stream_id' });

// Product associations
Product.belongsTo(User, { as: 'Owner', foreignKey: 'user_id' }); // Product owned by User
Product.belongsTo(Category, { foreignKey: 'category_id' });
Product.hasMany(Auction, { foreignKey: 'product_id' });

// Many-to-Many: Product <-> Stream (through StreamProduct)
Product.belongsToMany(Stream, {
  through: StreamProduct,
  foreignKey: 'product_id',
  otherKey: 'stream_id',
  as: 'FeaturedInStreams'
});

Stream.belongsToMany(Product, {
  through: StreamProduct,
  foreignKey: 'stream_id',
  otherKey: 'product_id',
  as: 'StreamCatalog' // Renamed from StreamProducts for clarity if you prefer
});

// Optional: Direct associations to the join table if you query it directly
StreamProduct.belongsTo(Product, { foreignKey: 'product_id' });
StreamProduct.belongsTo(Stream, { foreignKey: 'stream_id' });


// Auction associations
Auction.belongsTo(Product, { foreignKey: 'product_id' });
Auction.belongsTo(Stream, { foreignKey: 'stream_id', allowNull: true });
Auction.belongsTo(User, { as: 'winner', foreignKey: 'winner_id', allowNull: true });
Auction.hasMany(Bid, { foreignKey: 'auction_id' });
Auction.hasOne(Order, { foreignKey: 'auction_id', allowNull: true });

// Bid associations
Bid.belongsTo(Auction, { foreignKey: 'auction_id' });
Bid.belongsTo(User, { foreignKey: 'user_id' });

// Order associations
Order.belongsTo(User, { as: 'buyer', foreignKey: 'buyer_id' });
Order.belongsTo(User, { as: 'seller', foreignKey: 'seller_id' });
Order.belongsTo(Auction, { foreignKey: 'auction_id', allowNull: true });

// UserFollow (Many-to-Many for User follows User)
User.belongsToMany(User, {
  as: 'Following',
  through: UserFollow,
  foreignKey: 'follower_id',
  otherKey: 'followed_id',
});
User.belongsToMany(User, {
  as: 'Followers',
  through: UserFollow,
  foreignKey: 'followed_id',
  otherKey: 'follower_id',
});
UserFollow.belongsTo(User, { as: 'follower', foreignKey: 'follower_id' });
UserFollow.belongsTo(User, { as: 'followed', foreignKey: 'followed_id' });

// ProductImage associations
Product.hasMany(ProductImage, {
  foreignKey: 'product_id',
  as: 'images',
  onDelete: 'CASCADE',
});
ProductImage.belongsTo(Product, { foreignKey: 'product_id' });

// ChatMessage associations
ChatMessage.belongsTo(User, { foreignKey: 'user_id' });
User.hasMany(ChatMessage, { foreignKey: 'user_id' });
ChatMessage.belongsTo(Stream, { foreignKey: 'stream_id' });
Stream.hasMany(ChatMessage, { foreignKey: 'stream_id' });

// UserProductLike associations
User.belongsToMany(Product, {
  through: UserProductLike,
  foreignKey: 'user_id',
  otherKey: 'product_id',
  as: 'LikedProducts',
});
Product.belongsToMany(User, {
  through: UserProductLike,
  foreignKey: 'product_id',
  otherKey: 'user_id',
  as: 'ProductLikers',
});
UserProductLike.belongsTo(User, { foreignKey: 'user_id' });
UserProductLike.belongsTo(Product, { foreignKey: 'product_id' });

// UserProductView associations
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

// UserStreamLike associations
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

// UserStreamView associations
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
    await sequelize.authenticate();
    console.log('✅ PostgreSQL connection established');
    await sequelize.sync({ alter: true }); // Use { alter: true } carefully in production
    console.log('✅ All models synchronized (alter mode)');
  } catch (error) {
    console.error('❌ Database synchronization failed:', error);
    // process.exit(1); // Let the main index.js handle process exit
    throw error; // Re-throw to be caught by startServer
  }
};

// syncDatabase(); // Call this only if you want to sync on every server start (dev)

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
  StreamProduct, 
  UserProductLike,
  UserProductView,
  UserStreamLike,
  UserStreamView,
  sequelize,
};