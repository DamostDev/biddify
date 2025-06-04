// backend/scripts/export_recommender_data.mjs
// (Ensure this file is in a `scripts` directory or similar, adjust paths accordingly)

import 'dotenv/config'; // Load .env variables ASAP

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Op } from 'sequelize';

import {
  User, // Assuming you might need User model for stream/product owner info
  Product,
  Category,
  Stream,
  Auction,
  UserProductView,
  UserStreamView,
  UserProductLike,
  UserStreamLike,
  Order,
  sequelize // This should be exported from your models/index.js
} from '../models/index.js'; // Adjust path to your models/index.js

// Helper to get __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.join(__dirname, '..', 'recommender_data_export'); // Place it in backend/recommender_data_export
const BATCH_SIZE = 1000; // Adjust based on memory and performance

// --- Data Fetching Functions ---

async function fetchProductsWithDetails() {
  console.log('Fetching products with details...');
  const products = await Product.findAll({
    attributes: ['product_id', 'title', 'description', 'created_at'], // Add other relevant fields like 'user_id' for owner
    include: [{
      model: Category,
      attributes: ['name'],
      as: 'Category', // Use the alias defined in your associations
    }],
    // Add other includes if needed, e.g., User as Owner
    // order: [['product_id', 'ASC']], // Optional: for consistency if you plan to batch later
    raw: true,
    nest: true,
  });
  const productsFormatted = products.map(p => ({
    product_id: p.product_id,
    title: p.title,
    description: p.description,
    category_name: p.Category ? p.Category.name : null,
    created_at: p.created_at // Keep timestamps for potential time-based analysis
  }));
  console.log(`Fetched ${productsFormatted.length} products.`);
  return productsFormatted;
}

async function fetchStreamsWithDetails() {
  console.log('Fetching streams with details...');
  const streams = await Stream.findAll({
    attributes: ['stream_id', 'title', 'description', 'created_at', 'user_id'], // user_id for stream owner
    include: [{
      model: Category,
      attributes: ['name'],
      as: 'Category', // Use the alias defined in your associations
    }
    // Add other includes if needed, e.g., User as Owner
    ],
    // order: [['stream_id', 'ASC']], // Optional
    raw: true,
    nest: true,
  });
  const streamsFormatted = streams.map(s => ({
    stream_id: s.stream_id,
    user_id: s.user_id, // Stream owner
    title: s.title,
    description: s.description,
    category_name: s.Category ? s.Category.name : null,
    created_at: s.created_at
  }));
  console.log(`Fetched ${streamsFormatted.length} streams.`);
  return streamsFormatted;
}

async function fetchStreamProductMap() {
  console.log('Fetching stream-product mapping (via auctions)...');
  // This assumes products are linked to streams primarily via the auctions table.
  // If you have another way products are "featured" in streams, adjust this.
  const streamProductMapRaw = await Auction.findAll({
    attributes: ['stream_id', 'product_id'],
    where: {
      stream_id: { [Op.ne]: null },
      product_id: { [Op.ne]: null },
    },
    group: ['stream_id', 'product_id'], // Equivalent to DISTINCT
    raw: true,
  });

  const streamToProducts = streamProductMapRaw.reduce((acc, item) => {
    if (!acc[item.stream_id]) {
      acc[item.stream_id] = [];
    }
    // Ensure no duplicate product_ids per stream if data allows it (group should handle it)
    if (!acc[item.stream_id].includes(item.product_id)) {
        acc[item.stream_id].push(item.product_id);
    }
    return acc;
  }, {});
  console.log(`Fetched stream-product map for ${Object.keys(streamToProducts).length} streams.`);
  return streamToProducts;
}


async function extractAllUserInteractions() {
  const interactions = [];
  console.log('Starting ALL user interaction data extraction...');

  // 1. Product Likes
  console.log('Fetching product likes...');
  let offsetLikes = 0;
  let totalLikesFetched = 0;
  let currentLikesBatch;
  do {
    currentLikesBatch = await UserProductLike.findAll({
      attributes: ['user_id', ['product_id', 'item_id'], ['liked_at', 'timestamp']],
      limit: BATCH_SIZE,
      offset: offsetLikes,
      order: [['like_id', 'ASC']],
      raw: true
    });
    currentLikesBatch.forEach(like => {
      interactions.push({
        user_id: like.user_id,
        item_id: like.item_id, // Already aliased
        item_type: 'product',
        interaction_type: 'like',
        timestamp: like.timestamp,
      });
    });
    offsetLikes += currentLikesBatch.length;
    totalLikesFetched += currentLikesBatch.length;
    if (currentLikesBatch.length > 0) console.log(`Fetched ${offsetLikes} product likes...`);
  } while (currentLikesBatch.length === BATCH_SIZE);
  console.log(`Total product likes fetched: ${totalLikesFetched}`);

  // 2. Stream Likes
  console.log('Fetching stream likes...');
  let offsetStreamLikes = 0;
  let totalStreamLikesFetched = 0;
  let currentStreamLikesBatch;
  do {
    currentStreamLikesBatch = await UserStreamLike.findAll({
        attributes: ['user_id', ['stream_id', 'item_id'], ['liked_at', 'timestamp']],
        limit: BATCH_SIZE,
        offset: offsetStreamLikes,
        order: [['like_id', 'ASC']],
        raw: true
    });
    currentStreamLikesBatch.forEach(like => {
        interactions.push({
            user_id: like.user_id,
            item_id: like.item_id,
            item_type: 'stream',
            interaction_type: 'like',
            timestamp: like.timestamp,
        });
    });
    offsetStreamLikes += currentStreamLikesBatch.length;
    totalStreamLikesFetched += currentStreamLikesBatch.length;
    if (currentStreamLikesBatch.length > 0) console.log(`Fetched ${offsetStreamLikes} stream likes...`);
  } while (currentStreamLikesBatch.length === BATCH_SIZE);
  console.log(`Total stream likes fetched: ${totalStreamLikesFetched}`);


  // 3. Product Purchases (All via Auctions)
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
      include: [{
        model: Auction,
        attributes: ['product_id'], // Only need product_id from Auction
        required: true, // INNER JOIN to ensure auction exists
        where: { product_id: { [Op.ne]: null } } // Ensure product_id is not null
      }],
      // where: { status: { [Op.in]: ['paid', 'shipped', 'delivered'] } }, // Consider active purchases
      limit: BATCH_SIZE,
      offset: offsetPurchases,
      order: [['order_id', 'ASC']],
    });

    currentPurchasesBatch.forEach(orderInstance => {
      const order = orderInstance.get({ plain: true });
      if (order.Auction && order.Auction.product_id) {
        interactions.push({
          user_id: order.user_id,
          item_id: order.Auction.product_id,
          item_type: 'product',
          interaction_type: 'purchase',
          timestamp: order.timestamp,
        });
      }
    });
    offsetPurchases += currentPurchasesBatch.length;
    totalPurchasesFetched += currentPurchasesBatch.length;
    if (currentPurchasesBatch.length > 0) console.log(`Fetched ${offsetPurchases} product purchases...`);
  } while (currentPurchasesBatch.length === BATCH_SIZE);
  console.log(`Total product purchases fetched: ${totalPurchasesFetched}`);


  // 4. Product Views
  console.log('Fetching product views...');
  let offsetViews = 0;
  let totalViewsFetched = 0;
  let currentViewsBatch;
  do {
    currentViewsBatch = await UserProductView.findAll({
      attributes: ['user_id', ['product_id', 'item_id'], ['viewed_at', 'timestamp'], 'duration_ms'],
      limit: BATCH_SIZE,
      offset: offsetViews,
      order: [['view_id', 'ASC']],
      raw: true
    });
    currentViewsBatch.forEach(view => {
      interactions.push({
        user_id: view.user_id,
        item_id: view.item_id,
        item_type: 'product',
        interaction_type: 'view',
        timestamp: view.timestamp,
        duration_ms: view.duration_ms,
      });
    });
    offsetViews += currentViewsBatch.length;
    totalViewsFetched += currentViewsBatch.length;
    if (currentViewsBatch.length > 0) console.log(`Fetched ${offsetViews} product views...`);
  } while (currentViewsBatch.length === BATCH_SIZE);
  console.log(`Total product views fetched: ${totalViewsFetched}`);

  // 5. Stream Views
  console.log('Fetching stream views...');
  let offsetStreamViews = 0;
  let totalStreamViewsFetched = 0;
  let currentStreamViewsBatch;
  do {
    currentStreamViewsBatch = await UserStreamView.findAll({
        attributes: ['user_id', ['stream_id', 'item_id'], ['viewed_at', 'timestamp'], 'duration_ms', 'percentage_watched'],
        limit: BATCH_SIZE,
        offset: offsetStreamViews,
        order: [['view_id', 'ASC']],
        raw: true
    });
    currentStreamViewsBatch.forEach(view => {
        interactions.push({
            user_id: view.user_id,
            item_id: view.item_id,
            item_type: 'stream',
            interaction_type: 'view',
            timestamp: view.timestamp,
            duration_ms: view.duration_ms,
            percentage_watched: view.percentage_watched
        });
    });
    offsetStreamViews += currentStreamViewsBatch.length;
    totalStreamViewsFetched += currentStreamViewsBatch.length;
    if (currentStreamViewsBatch.length > 0) console.log(`Fetched ${offsetStreamViews} stream views...`);
  } while (currentStreamViewsBatch.length === BATCH_SIZE);
  console.log(`Total stream views fetched: ${totalStreamViewsFetched}`);


  console.log(`Total interactions extracted: ${interactions.length}`);
  // Sort by timestamp before returning, good for time-based splits later
  interactions.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  return interactions;
}

// --- Main execution block ---
async function main() {
  console.log(`Starting main data export process at ${new Date().toISOString()}`);
  console.log(`Output directory will be: ${OUTPUT_DIR}`);

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`Created output directory: ${OUTPUT_DIR}`);
  }

  try {
    console.log('Attempting to connect to the database for data export...');
    await sequelize.authenticate();
    console.log('✅ Database connection successful for data export.');

    // 1. Export Products
    const productsData = await fetchProductsWithDetails();
    const productsFile = path.join(OUTPUT_DIR, 'products.json');
    fs.writeFileSync(productsFile, JSON.stringify(productsData, null, 2));
    console.log(`✅ Product data written to ${productsFile}`);

    // 2. Export Streams
    const streamsData = await fetchStreamsWithDetails();
    const streamsFile = path.join(OUTPUT_DIR, 'streams.json');
    fs.writeFileSync(streamsFile, JSON.stringify(streamsData, null, 2));
    console.log(`✅ Stream data written to ${streamsFile}`);

    // 3. Export Stream-Product Map
    const streamProductMapData = await fetchStreamProductMap();
    const streamProductMapFile = path.join(OUTPUT_DIR, 'stream_product_map.json');
    fs.writeFileSync(streamProductMapFile, JSON.stringify(streamProductMapData, null, 2));
    console.log(`✅ Stream-product map data written to ${streamProductMapFile}`);

    // 4. Export All Interactions
    const interactionData = await extractAllUserInteractions();
    const interactionsFile = path.join(OUTPUT_DIR, 'interactions.json');
    fs.writeFileSync(interactionsFile, JSON.stringify(interactionData, null, 2));
    console.log(`✅ Interaction data written to ${interactionsFile}`);

    console.log('\n--- Summary of Exported Data ---');
    console.log(`Total Products: ${productsData.length}`);
    console.log(`Total Streams: ${streamsData.length}`);
    console.log(`Total Streams in Map: ${Object.keys(streamProductMapData).length}`);
    console.log(`Total Interactions: ${interactionData.length}`);
    if (interactionData.length > 0) {
        const interactionTypes = interactionData.reduce((acc, curr) => {
            const key = `${curr.item_type}_${curr.interaction_type}`;
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});
        console.log('Interaction Type Counts:', interactionTypes);
    }

    console.log(`\n🎉 Data export process completed successfully at ${new Date().toISOString()}`);

  } catch (error) {
    console.error('❌ Failed to run main data export process:', error);
    process.exitCode = 1; // Indicate failure
  } finally {
    if (sequelize) {
      await sequelize.close();
      console.log('Database connection closed.');
    }
  }
}

// --- Script execution ---
// Check if the script is being run directly
const scriptPath = fileURLToPath(import.meta.url);
const mainScriptPath = process.argv[1]; // Path of the executed script

if (scriptPath === mainScriptPath) {
    console.log("Running export_recommender_data.mjs directly...");
    main();
} else {
    console.log("export_recommender_data.mjs is being imported, not run directly.");
}

// Export functions if you intend to import them elsewhere (optional for this script)
// export { fetchProductsWithDetails, fetchStreamsWithDetails, extractAllUserInteractions, main };