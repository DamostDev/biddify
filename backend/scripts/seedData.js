import {
    sequelize, // Import your main sequelize instance
    // Import all models that might have relations to clear in specific order
    Bid,
    Order,
    Auction,
    ProductImage,
    ChatMessage,
    UserProductLike,
    UserProductView,
    UserStreamLike,
    UserStreamView,
    Product,
    Stream,
    UserFollow,
    Category,
    // User // Usually you might want to keep users, but if not, include it LAST
  } from '../src/models/index.js'; // Adjust path if needed
  
  async function clearData() {
    try {
      console.log('Connecting to database to clear data...');
      await sequelize.authenticate();
      console.log('Database connection established.');
  
      console.warn('WARNING: This script will DELETE data from several tables.');
      console.log('Starting data deletion in 5 seconds... Press Ctrl+C to cancel.');
      await new Promise(resolve => setTimeout(resolve, 5000)); // 5-second delay to cancel
  
      // Disable foreign key checks temporarily for easier truncation order
      // This is specific to PostgreSQL. For other dialects, the command might differ.
      await sequelize.query('SET CONSTRAINTS ALL DEFERRED;');
      // Or for more granular control:
      // await sequelize.query('ALTER TABLE "your_table_name" DISABLE TRIGGER ALL;'); (repeat for all)
  
      console.log('Attempting to truncate tables...');
  
      // Truncate tables in an order that respects (or temporarily ignores) foreign key constraints
      // Typically, join tables first, then tables they refer to if not cascading.
      // With SET CONSTRAINTS ALL DEFERRED, the order is less critical but still good practice.
  
      // Interaction / Join Tables
      await Bid.destroy({ truncate: true, cascade: false }); console.log('Bids truncated.');
      await Order.destroy({ truncate: true, cascade: false }); console.log('Orders truncated.');
      await UserProductLike.destroy({ truncate: true, cascade: false }); console.log('UserProductLikes truncated.');
      await UserProductView.destroy({ truncate: true, cascade: false }); console.log('UserProductViews truncated.');
      await UserStreamLike.destroy({ truncate: true, cascade: false }); console.log('UserStreamLikes truncated.');
      await UserStreamView.destroy({ truncate: true, cascade: false }); console.log('UserStreamViews truncated.');
      await ChatMessage.destroy({ truncate: true, cascade: false }); console.log('ChatMessages truncated.');
      await UserFollow.destroy({ truncate: true, cascade: false }); console.log('UserFollows truncated.');
  
      // Tables with dependencies
      await Auction.destroy({ truncate: true, cascade: false }); console.log('Auctions truncated.');
      await ProductImage.destroy({ truncate: true, cascade: false }); console.log('ProductImages truncated.');
      await Product.destroy({ truncate: true, cascade: false }); console.log('Products truncated.');
      await Stream.destroy({ truncate: true, cascade: false }); console.log('Streams truncated.');
  
      // Core tables
      await Category.destroy({ truncate: true, cascade: false }); console.log('Categories truncated.');
  
      // Optionally, if you want to clear users too (be careful!)
      // await User.destroy({ truncate: true, cascade: false }); console.log('Users truncated.');
  
  
      // Re-enable foreign key checks (PostgreSQL specific)
      await sequelize.query('SET CONSTRAINTS ALL IMMEDIATE;');
      // Or:
      // await sequelize.query('ALTER TABLE "your_table_name" ENABLE TRIGGER ALL;'); (repeat for all)
  
      console.log('Specified tables have been truncated.');
  
    } catch (error) {
      console.error('Error clearing data:', error);
    } finally {
      await sequelize.close();
      console.log('Database connection closed.');
    }
  }
  
  clearData();