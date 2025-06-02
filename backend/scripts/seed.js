// seed.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import csv from 'csv-parser';
import {
  sequelize,
  User,
  Category,
  Product,
  Stream,
  Auction, // New
  Bid,     // New
  Order,   // New
  UserFollow,
  UserProductLike,
  UserProductView,
  UserStreamLike,
  UserStreamView,
  ProductImage, // Keep for full schema sync
  ChatMessage   // Keep for full schema sync
} from '../src/models/index.js'; // Adjust path if your script is elsewhere

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.resolve(__dirname, 'data');

const guidToIdMap = {
  users: {},
  categories: {},
  products: {},
  streams: {},
  auctions: {}, // New
};

async function parseCSV(fileName) {
  const filePath = path.join(dataDir, fileName);
  return new Promise((resolve, reject) => {
    const results = [];
    if (!fs.existsSync(filePath)) {
        return reject(new Error(`CSV file not found: ${filePath}`));
    }
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
}

const parseInteger = (val) => (val && val.trim() !== '' ? parseInt(val, 10) : null);
const parseFloatNum = (val) => (val && val.trim() !== '' ? parseFloat(val) : null);
const parseDate = (val) => (val && val.trim() !== '' ? new Date(val) : null);
const parseBoolean = (val) => (val === '1' || val === 'true' || val === 1 || val === true);


// Helper to parse JSON string from CSV, removing potential backticks
const parseJsonString = (jsonString, guidForWarning, fieldName) => {
  if (!jsonString || typeof jsonString !== 'string') {
    return null;
  }
  // Remove potential markdown code block fences
  let cleanJsonString = jsonString.replace(/^```json\s*/im, '').replace(/\s*```$/, '');
  try {
    return JSON.parse(cleanJsonString);
  } catch (e) {
    console.warn(`Failed to parse ${fieldName} for GUID ${guidForWarning}: Original: "${jsonString}", Cleaned: "${cleanJsonString}". Error: ${e.message}`);
    return null;
  }
};


async function seedDatabase() {
  const transaction = await sequelize.transaction();
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL connection established for seeding.');

    console.log('🔄 Synchronizing database schema (force: true)...');
    await sequelize.sync({ force: true, transaction });
    console.log('✅ Database schema synchronized.');

    // --- 1. Seed Categories ---
    console.log('🌱 Seeding Categories...');
    const categoriesData = await parseCSV('synthetic_categories.csv');
    for (const row of categoriesData) {
      const category = await Category.create({
        name: row.name,
        description: row.description || null,
        parent_category_id: row.parent_category_id_placeholder === '0' || !row.parent_category_id_placeholder ? null : parseInt(row.parent_category_id_placeholder)
      }, { transaction });
      guidToIdMap.categories[row.category_guid] = category.category_id;
    }
    console.log(`✅ Categories seeded: ${Object.keys(guidToIdMap.categories).length}`);

    // --- 2. Seed Users ---
    console.log('🌱 Seeding Users...');
    const usersData = await parseCSV('synthetic_users.csv');
    for (const row of usersData) {
      const username = row.username ? row.username.split('\n')[0].trim() : `user_${row.user_guid.substring(0,8)}`;
      const email = row.email ? row.email.split('\n')[0].trim() : null;
      const user = await User.create({
        username: username,
        full_name: row.full_name || null,
        email: email,
        password_hash: row.password_hash,
        livekitRoomName: row.livekitRoomName || null,
        profile_picture_url: row.profile_picture_url || null,
        bio: row.bio || null,
        seller_rating: parseFloatNum(row.seller_rating),
        buyer_rating: parseFloatNum(row.buyer_rating),
        stripe_customer_id: row.stripe_customer_id || null,
        created_at: parseDate(row.created_at),
        updated_at: parseDate(row.updated_at),
        last_login: parseDate(row.last_login),
        is_verified: parseBoolean(row.is_verified),
        is_banned: parseBoolean(row.is_banned),
      }, { transaction });
      guidToIdMap.users[row.user_guid] = user.user_id;
    }
    console.log(`✅ Users seeded: ${Object.keys(guidToIdMap.users).length}`);

    // --- 3. Seed Products ---
    console.log('🌱 Seeding Products...');
    const productsData = await parseCSV('synthetic_products.csv');
    for (const row of productsData) {
      const userId = guidToIdMap.users[row.user_guid_fk];
      if (userId === undefined) { console.warn(`User GUID ${row.user_guid_fk} not found for product ${row.product_guid}. Skipping.`); continue; }
      
      const categoryId = guidToIdMap.categories[row.category_guid_fk] || null;
      
      let productTitle = row.title ? row.title.split('\n')[0].trim() : 'Untitled Product'; 
      if (productTitle.length > 100) {
        console.warn(`Product title for GUID ${row.product_guid} is too long ("${productTitle}"). Truncating to 100 chars.`);
        productTitle = productTitle.substring(0, 100);
      }

      const product = await Product.create({
        user_id: userId,
        title: productTitle,
        description: row.description || null,
        category_id: categoryId,
        condition: row.condition || null,
        original_price: parseFloatNum(row.original_price),
        is_active: parseBoolean(row.is_active),
        created_at: parseDate(row.created_at),
        updated_at: parseDate(row.updated_at),
      }, { transaction });
      guidToIdMap.products[row.product_guid] = product.product_id;
    }
    console.log(`✅ Products seeded: ${Object.keys(guidToIdMap.products).length}`);

    // --- 4. Seed Streams ---
    console.log('🌱 Seeding Streams...');
    const streamsData = await parseCSV('synthetic_streams.csv');
    for (const row of streamsData) {
      const userId = guidToIdMap.users[row.user_guid_fk];
      if (userId === undefined) { console.warn(`User GUID ${row.user_guid_fk} not found for stream ${row.stream_guid}. Skipping.`); continue; }
      
      const categoryId = guidToIdMap.categories[row.category_guid_fk] || null;

      let streamTitle = row.title ? row.title.split('\n')[0].trim() : 'Untitled Stream';
      if (streamTitle.length > 100) {
          console.warn(`Stream title for GUID ${row.stream_guid} is too long ("${streamTitle}"). Truncating.`);
          streamTitle = streamTitle.substring(0, 100);
      }
      const streamDescription = row.description ? row.description.split('\n\n')[0].trim() : null;

      const stream = await Stream.create({
        user_id: userId,
        title: streamTitle,
        description: streamDescription,
        thumbnail_url: row.thumbnail_url || null,
        category_id: categoryId,
        start_time: parseDate(row.start_time),
        end_time: parseDate(row.end_time),
        status: row.status || 'scheduled',
        viewer_count: parseInteger(row.viewer_count) || 0,
        max_viewer_count: parseInteger(row.max_viewer_count) || 0,
        is_private: parseBoolean(row.is_private),
        stream_key: row.stream_key || null,
        livekitRoomName: row.livekitRoomName || null,
        created_at: parseDate(row.created_at),
        updated_at: parseDate(row.updated_at),
      }, { transaction });
      guidToIdMap.streams[row.stream_guid] = stream.stream_id;
    }
    console.log(`✅ Streams seeded: ${Object.keys(guidToIdMap.streams).length}`);

    // --- 5. Seed Auctions ---
    console.log('🌱 Seeding Auctions...');
    const auctionsData = await parseCSV('synthetic_auctions.csv');
    for (const row of auctionsData) {
        const productId = guidToIdMap.products[row.product_guid_fk];
        if (productId === undefined) { console.warn(`Product GUID ${row.product_guid_fk} not found for auction ${row.auction_guid}. Skipping.`); continue; }
        
        const streamId = row.stream_guid_fk ? guidToIdMap.streams[row.stream_guid_fk] : null;
        if (row.stream_guid_fk && streamId === undefined) { console.warn(`Stream GUID ${row.stream_guid_fk} provided but not found for auction ${row.auction_guid}. Setting stream_id to null.`); }

        const winnerId = row.winner_user_guid_fk ? guidToIdMap.users[row.winner_user_guid_fk] : null;
        if (row.winner_user_guid_fk && winnerId === undefined) { console.warn(`Winner User GUID ${row.winner_user_guid_fk} provided but not found for auction ${row.auction_guid}. Setting winner_id to null.`);}

        const auction = await Auction.create({
            product_id: productId,
            stream_id: streamId || null, // Ensure null if undefined
            starting_price: parseFloatNum(row.starting_price),
            current_price: parseFloatNum(row.current_price) || parseFloatNum(row.starting_price), // Fallback to starting_price if current is not set
            reserve_price: parseFloatNum(row.reserve_price),
            start_time: parseDate(row.start_time),
            end_time: parseDate(row.end_time),
            duration_seconds: parseInteger(row.duration_seconds),
            status: row.status || 'pending',
            winner_id: winnerId || null, // Ensure null if undefined
            bid_count: parseInteger(row.bid_count) || 0,
        }, { transaction });
        guidToIdMap.auctions[row.auction_guid] = auction.auction_id;
    }
    console.log(`✅ Auctions seeded: ${Object.keys(guidToIdMap.auctions).length}`);

    // --- 6. Seed UserFollows ---
    console.log('🌱 Seeding UserFollows...');
    const userFollowsData = await parseCSV('synthetic_user_follows.csv');
    const userFollowsToCreate = userFollowsData.map(row => {
      const followerId = guidToIdMap.users[row.follower_guid_fk];
      if (followerId === undefined) { console.warn(`Follower User GUID ${row.follower_guid_fk} not found. Skipping follow.`); return null; }
      const followedId = guidToIdMap.users[row.followed_guid_fk];
      if (followedId === undefined) { console.warn(`Followed User GUID ${row.followed_guid_fk} not found. Skipping follow.`); return null; }
      return { follower_id: followerId, followed_id: followedId, created_at: parseDate(row.created_at) };
    }).filter(item => item !== null);
    if (userFollowsToCreate.length > 0) {
        await UserFollow.bulkCreate(userFollowsToCreate, { transaction, ignoreDuplicates: true });
    }
    console.log(`✅ UserFollows seeded: ${userFollowsToCreate.length}`);

    // --- 7. Seed UserProductLikes ---
    console.log('🌱 Seeding UserProductLikes...');
    const userProductLikesData = await parseCSV('synthetic_product_likes.csv');
    const userProductLikesToCreate = userProductLikesData.map(row => {
      const userId = guidToIdMap.users[row.user_guid_fk];
      if (userId === undefined) { console.warn(`User GUID ${row.user_guid_fk} not found for product like. Skipping.`); return null; }
      const productId = guidToIdMap.products[row.product_guid_fk];
      if (productId === undefined) { console.warn(`Product GUID ${row.product_guid_fk} not found for product like. Skipping.`); return null; }
      return { user_id: userId, product_id: productId, liked_at: parseDate(row.liked_at) };
    }).filter(item => item !== null);
    if (userProductLikesToCreate.length > 0) {
        await UserProductLike.bulkCreate(userProductLikesToCreate, { transaction, ignoreDuplicates: true });
    }
    console.log(`✅ UserProductLikes seeded: ${userProductLikesToCreate.length}`);

    // --- 8. Seed UserProductViews ---
    console.log('🌱 Seeding UserProductViews...');
    const userProductViewsData = await parseCSV('synthetic_product_views.csv');
    const userProductViewsToCreate = userProductViewsData.map(row => {
      const userId = guidToIdMap.users[row.user_guid_fk];
      if (userId === undefined) { console.warn(`User GUID ${row.user_guid_fk} not found for product view. Skipping.`); return null; }
      const productId = guidToIdMap.products[row.product_guid_fk];
      if (productId === undefined) { console.warn(`Product GUID ${row.product_guid_fk} not found for product view. Skipping.`); return null; }
      return { user_id: userId, product_id: productId, viewed_at: parseDate(row.viewed_at), duration_ms: parseInteger(row.duration_ms) };
    }).filter(item => item !== null);
     if (userProductViewsToCreate.length > 0) {
      await UserProductView.bulkCreate(userProductViewsToCreate, { transaction, ignoreDuplicates: true });
    }
    console.log(`✅ UserProductViews seeded: ${userProductViewsToCreate.length}`);

    // --- 9. Seed UserStreamLikes ---
    console.log('🌱 Seeding UserStreamLikes...');
    const userStreamLikesData = await parseCSV('synthetic_stream_likes.csv');
    const userStreamLikesToCreate = userStreamLikesData.map(row => {
      const userId = guidToIdMap.users[row.user_guid_fk];
      if (userId === undefined) { console.warn(`User GUID ${row.user_guid_fk} not found for stream like. Skipping.`); return null; }
      const streamId = guidToIdMap.streams[row.stream_guid_fk];
      if (streamId === undefined) { console.warn(`Stream GUID ${row.stream_guid_fk} not found for stream like. Skipping.`); return null; }
      return { user_id: userId, stream_id: streamId, liked_at: parseDate(row.liked_at) };
    }).filter(item => item !== null);
    if (userStreamLikesToCreate.length > 0) {
        await UserStreamLike.bulkCreate(userStreamLikesToCreate, { transaction, ignoreDuplicates: true });
    }
    console.log(`✅ UserStreamLikes seeded: ${userStreamLikesToCreate.length}`);

    // --- 10. Seed UserStreamViews ---
    console.log('🌱 Seeding UserStreamViews...');
    const userStreamViewsData = await parseCSV('synthetic_stream_views.csv');
    const userStreamViewsToCreate = userStreamViewsData.map(row => {
      const userId = guidToIdMap.users[row.user_guid_fk];
      if (userId === undefined) { console.warn(`User GUID ${row.user_guid_fk} not found for stream view. Skipping.`); return null; }
      const streamId = guidToIdMap.streams[row.stream_guid_fk];
      if (streamId === undefined) { console.warn(`Stream GUID ${row.stream_guid_fk} not found for stream view. Skipping.`); return null; }
      return { user_id: userId, stream_id: streamId, viewed_at: parseDate(row.viewed_at), duration_ms: parseInteger(row.duration_ms), percentage_watched: parseFloatNum(row.percentage_watched) };
    }).filter(item => item !== null);
    if (userStreamViewsToCreate.length > 0) {
        await UserStreamView.bulkCreate(userStreamViewsToCreate, { transaction, ignoreDuplicates: true });
    }
    console.log(`✅ UserStreamViews seeded: ${userStreamViewsToCreate.length}`);

    // --- 11. Seed Bids ---
    console.log('🌱 Seeding Bids...');
    const bidsData = await parseCSV('synthetic_bids.csv');
    const bidsToCreate = bidsData.map(row => {
        const auctionId = guidToIdMap.auctions[row.auction_guid_fk];
        if (auctionId === undefined) { console.warn(`Auction GUID ${row.auction_guid_fk} not found for bid ${row.bid_guid}. Skipping.`); return null; }
        
        const userId = guidToIdMap.users[row.user_guid_fk];
        if (userId === undefined) { console.warn(`User GUID ${row.user_guid_fk} not found for bid ${row.bid_guid}. Skipping.`); return null; }

        return {
            auction_id: auctionId,
            user_id: userId,
            amount: parseFloatNum(row.amount),
            bid_time: parseDate(row.bid_time),
            is_winning: parseBoolean(row.is_winning),
            is_cancelled: parseBoolean(row.is_cancelled),
        };
    }).filter(item => item !== null);
    if (bidsToCreate.length > 0) {
        await Bid.bulkCreate(bidsToCreate, { transaction });
    }
    console.log(`✅ Bids seeded: ${bidsToCreate.length}`);

    // --- 12. Seed Orders ---
    console.log('🌱 Seeding Orders...');
    const ordersData = await parseCSV('synthetic_orders.csv');
    const ordersToCreate = ordersData.map(row => {
        const buyerId = guidToIdMap.users[row.buyer_user_guid_fk];
        if (buyerId === undefined) { console.warn(`Buyer User GUID ${row.buyer_user_guid_fk} not found for order ${row.order_guid}. Skipping.`); return null; }

        const sellerId = guidToIdMap.users[row.seller_user_guid_fk];
        if (sellerId === undefined) { console.warn(`Seller User GUID ${row.seller_user_guid_fk} not found for order ${row.order_guid}. Skipping.`); return null; }
        
        const auctionId = row.auction_guid_fk ? guidToIdMap.auctions[row.auction_guid_fk] : null;
        if (row.auction_guid_fk && auctionId === undefined) { console.warn(`Auction GUID ${row.auction_guid_fk} provided but not found for order ${row.order_guid}. Setting auction_id to null.`); }
        
        const shippingAddress = parseJsonString(row.shipping_address_json, row.order_guid, 'shipping_address_json');

        return {
            buyer_id: buyerId,
            seller_id: sellerId,
            auction_id: auctionId || null, // Ensure null if undefined
            total_amount: parseFloatNum(row.total_amount),
            shipping_cost: parseFloatNum(row.shipping_cost),
            tax_amount: parseFloatNum(row.tax_amount),
            status: row.status || 'pending',
            payment_intent_id: row.payment_intent_id || null,
            shipping_address: shippingAddress,
            created_at: parseDate(row.created_at),
            updated_at: parseDate(row.updated_at),
        };
    }).filter(item => item !== null);
    if (ordersToCreate.length > 0) {
        await Order.bulkCreate(ordersToCreate, { transaction });
    }
    console.log(`✅ Orders seeded: ${ordersToCreate.length}`);


    await transaction.commit();
    console.log('🎉 Database seeding completed successfully and transaction committed!');

  } catch (error) {
    if (transaction && transaction.finished !== 'commit' && transaction.finished !== 'rollback') {
        await transaction.rollback();
        console.error('❌ Transaction rolled back due to error.');
    }
    console.error('❌ Error during database seeding:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
    console.log('🚪 PostgreSQL connection closed.');
  }
}

seedDatabase();