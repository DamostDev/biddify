// models/index.js
import sequelize from '../lib/connectPG.js';
import User from './user.model.js';

// Import other models here as you create them
// import Product from './Product.js';
// import Review from './Review.js';

// Define model associations here
// Example:
// User.hasMany(Product, { foreignKey: 'seller_id' });
// User.hasMany(Review, { foreignKey: 'reviewer_id' });

const syncDatabase = async () => {
  try {
    // Test the connection first
    await sequelize.authenticate();
    console.log('✅ PostgreSQL connection established');

    // Then sync all models
    await sequelize.sync({ alter: true });
    console.log('✅ All models synchronized (alter mode)');
    
    // For initial development only - use migrations in production
    // await sequelize.sync({ force: true }); // DANGER: Drops all tables!
  } catch (error) {
    console.error('❌ Database synchronization failed:', error);
    process.exit(1); // Exit with error code
  }
};

// Immediately invoke the sync function when this module is imported
syncDatabase();

// Export all models
export { User };
// export { User, Product, Review };