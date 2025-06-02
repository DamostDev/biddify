// backend/src/ml_pipeline/data_extraction/recommenderDataExtractor.js
import {
  Auction,
  Order,
  UserProductLike,
  UserProductView,
  Product // Keep Product import for context and potential future use
} from '../models/index.js'; // Adjust path based on your file structure
import { Op } from 'sequelize';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Helper to get __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Extracts initial user-product interactions for the recommender system.
 * Focuses on:
 * 1. Product Likes (Explicit positive)
 * 2. Product Purchases (Strong implicit positive, via Auctions, assuming all orders from auctions)
 * 3. Product Views (Weak implicit positive)
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of interaction objects.
 */
async function extractInitialProductInteractions() {
  const interactions = [];
  const BATCH_SIZE = 1000; // Adjust based on memory and performance

  console.log('Starting data extraction for recommender system...');

  try {
    // 1. Product Likes
    console.log('Fetching product likes...');
    let offsetLikes = 0;
    let totalLikesFetched = 0;
    let currentLikesBatch;
    do {
      currentLikesBatch = await UserProductLike.findAll({
        attributes: ['user_id', 'product_id', ['liked_at', 'timestamp']],
        limit: BATCH_SIZE,
        offset: offsetLikes,
        order: [['like_id', 'ASC']], // Consistent ordering for pagination
        raw: true // Get plain JSON objects
      });
      currentLikesBatch.forEach(like => {
        interactions.push({
          user_id: like.user_id,
          product_id: like.product_id,
          interaction_type: 'like',
          timestamp: like.timestamp,
        });
      });
      offsetLikes += currentLikesBatch.length;
      totalLikesFetched += currentLikesBatch.length;
      if (currentLikesBatch.length > 0) console.log(`Fetched ${offsetLikes} product likes so far in this run...`);
    } while (currentLikesBatch.length === BATCH_SIZE);
    console.log(`Total product likes fetched: ${totalLikesFetched}`);

    // 2. Product Purchases (All via Auctions)
    console.log('Fetching product purchases (all via auctions)...');
    let offsetPurchases = 0;
    let totalPurchasesFetched = 0;
    let currentPurchasesBatch;
    do {
      currentPurchasesBatch = await Order.findAll({
        attributes: [
          ['buyer_id', 'user_id'],
          ['created_at', 'timestamp']
        ],
        include: [
          {
            model: Auction,
            attributes: ['product_id'],
            required: true,
          }
        ],
        // where: {
        //   status: { [Op.in]: ['paid', 'shipped', 'delivered'] } // Consider appropriate statuses
        // },
        limit: BATCH_SIZE,
        offset: offsetPurchases,
        order: [['order_id', 'ASC']],
        // Using raw: true here might require careful handling of nested objects
        // It's often easier to let Sequelize build the objects and then access properties
      });

      currentPurchasesBatch.forEach(orderInstance => {
        // Access eager-loaded association via the alias (default is model name)
        const order = orderInstance.get({ plain: true }); // Get plain object
        if (order.Auction && order.Auction.product_id) {
          interactions.push({
            user_id: order.user_id,
            product_id: order.Auction.product_id,
            interaction_type: 'purchase',
            timestamp: order.timestamp,
          });
        } else {
          console.warn(`Order (Buyer: ${order.user_id}, Time: ${order.timestamp}) was expected to have an auction with a product_id, but was missing. Order ID: ${order.order_id}`);
        }
      });
      offsetPurchases += currentPurchasesBatch.length;
      totalPurchasesFetched += currentPurchasesBatch.length;
      if (currentPurchasesBatch.length > 0) console.log(`Fetched ${offsetPurchases} product purchases so far in this run...`);
    } while (currentPurchasesBatch.length === BATCH_SIZE);
    console.log(`Total product purchases fetched: ${totalPurchasesFetched}`);


    // 3. Product Views
    console.log('Fetching product views...');
    let offsetViews = 0;
    let totalViewsFetched = 0;
    let currentViewsBatch;
    do {
      currentViewsBatch = await UserProductView.findAll({
        attributes: ['user_id', 'product_id', ['viewed_at', 'timestamp'], 'duration_ms'],
        limit: BATCH_SIZE,
        offset: offsetViews,
        order: [['view_id', 'ASC']],
        raw: true // Get plain JSON objects
      });
      currentViewsBatch.forEach(view => {
        interactions.push({
          user_id: view.user_id,
          product_id: view.product_id,
          interaction_type: 'view',
          timestamp: view.timestamp,
          duration_ms: view.duration_ms,
        });
      });
      offsetViews += currentViewsBatch.length;
      totalViewsFetched += currentViewsBatch.length;
      if (currentViewsBatch.length > 0) console.log(`Fetched ${offsetViews} product views so far in this run...`);
    } while (currentViewsBatch.length === BATCH_SIZE);
    console.log(`Total product views fetched: ${totalViewsFetched}`);

    console.log(`Total initial interactions extracted: ${interactions.length}`);
    return interactions;

  } catch (error) {
    console.error('Error extracting recommender data:', error);
    throw error;
  }
}

// --- Main execution block to run the script and save output ---
async function main() {
  // Dynamically import sequelize only within main if needed for closing
  // This avoids issues if the script is imported elsewhere without running main
  let sequelizeInstance;
  try {
    const { default: sequelize } = await import('../lib/connectPG.js'); // Adjust path
    sequelizeInstance = sequelize;

    console.log('Attempting to connect to the database for data extraction...');
    await sequelizeInstance.authenticate(); // Test connection
    console.log('Database connection successful for data extraction.');

    const interactionData = await extractInitialProductInteractions();
    console.log(`Successfully extracted ${interactionData.length} interactions.`);

    const outputFilePath = path.join(__dirname, 'recommender_interactions.json');
    fs.writeFileSync(outputFilePath, JSON.stringify(interactionData, null, 2));
    console.log(`Interaction data written to ${outputFilePath}`);

    if (interactionData.length > 0) {
      const purchases = interactionData.filter(i => i.interaction_type === 'purchase');
      const likes = interactionData.filter(i => i.interaction_type === 'like');
      const views = interactionData.filter(i => i.interaction_type === 'view');

      console.log(`\n--- Summary of Extracted Data ---`);
      console.log(`Total Purchases: ${purchases.length}`);
      console.log(`Total Likes: ${likes.length}`);
      console.log(`Total Views: ${views.length}`);
      console.log(`\nSample of first 2 overall interactions:`, interactionData.slice(0, 2));
    }

  } catch (error) {
    console.error('Failed to run main data extraction:', error);
    process.exitCode = 1; // Indicate failure
  } finally {
    if (sequelizeInstance) {
      await sequelizeInstance.close();
      console.log('Database connection closed.');
    }
  }
}

// Only run main if this script is executed directly
// Handles both commonjs and esm ways of checking if script is main
const scriptPath = fileURLToPath(import.meta.url);
const mainScriptPath = process.argv[1];
if (scriptPath === mainScriptPath) {
    main();
}

// Export the function in case you want to import it elsewhere without running main
export { extractInitialProductInteractions };