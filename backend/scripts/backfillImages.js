import dotenv from 'dotenv';
// Adjust the path to your .env file if this script is not at the project root
// For example, if 'scripts' is at root, and .env is in './backend/.env'
dotenv.config({ path: './backend/.env' }); // Or just dotenv.config() if .env is at project root

// Adjust the import path based on your project structure.
// This assumes 'scripts' directory is at the same level as 'backend' directory.
import { sequelize, User, Stream } from '../src/models/index.js';
import { Op } from 'sequelize'; // Import Op if you need more complex where clauses later

// --- Image Generation Functions (same as before) ---
const generateUserAvatarUrl = (nameOrUsername, userId) => {
  const namePart = nameOrUsername ? nameOrUsername.trim().split(' ').map(n => n[0] || '').join('').substring(0, 2) : `U${userId}`;
  const name = encodeURIComponent(namePart || `User${userId}`);
  return `https://ui-avatars.com/api/?name=${name}&background=random&color=fff&size=256&bold=true&format=png`;
};

const generateStreamThumbnailUrl = (streamId, streamTitle) => {
  const seed = encodeURIComponent(streamId || streamTitle || Math.random().toString());
  return `https://picsum.photos/seed/${seed}/400/225`;
};

async function overwriteAllUserProfilePictures() {
  console.log('Starting to OVERWRITE ALL user profile pictures...');
  let updatedCount = 0, failedCount = 0;
  const t = await sequelize.transaction();

  try {
    // Fetch ALL users
    const allUsers = await User.findAll({
      attributes: ['user_id', 'username', 'full_name'], // Fetch only necessary attributes
      transaction: t,
    });

    if (allUsers.length === 0) {
      console.log('No users found in the database.');
      await t.commit();
      return { updatedCount: 0, failedCount: 0 };
    }

    console.log(`Found ${allUsers.length} users. ALL profile pictures will be overwritten.`);

    for (const user of allUsers) {
      const newImageUrl = generateUserAvatarUrl(user.username || user.full_name, user.user_id);
      // console.log(`  - Overwriting user ID ${user.user_id} with URL: ${newImageUrl}`);
      try {
        await user.update({ profile_picture_url: newImageUrl }, { transaction: t });
        updatedCount++;
      } catch (innerError) {
        console.error(`  - FAILED to update user ID ${user.user_id}: ${innerError.message}`);
        failedCount++;
      }
    }

    await t.commit();
    console.log(`User Profile Pictures: Transaction COMMITTED. Successfully overwrote ${updatedCount} URLs. Failed: ${failedCount}.`);
  } catch (error) {
    if (t.finished !== 'commit' && t.finished !== 'rollback') {
        await t.rollback();
    }
    console.error('! CRITICAL ERROR during user profile picture overwrite, transaction ROLLED BACK (if active).', error);
    // Recalculate failedCount if the outer try block caught the error
    failedCount = (await User.count({ transaction: t.finished === 'rollback' ? null : t })) - updatedCount; 
  }
  return { updatedCount, failedCount };
}

async function overwriteAllStreamThumbnails() {
  console.log('Starting to OVERWRITE ALL stream thumbnails...');
  let updatedCount = 0, failedCount = 0;
  const t = await sequelize.transaction();

  try {
    // Fetch ALL streams
    const allStreams = await Stream.findAll({
      attributes: ['stream_id', 'title'], // Fetch only necessary attributes
      transaction: t,
    });

    if (allStreams.length === 0) {
      console.log('No streams found in the database.');
      await t.commit();
      return { updatedCount: 0, failedCount: 0 };
    }

    console.log(`Found ${allStreams.length} streams. ALL thumbnails will be overwritten.`);

    for (const stream of allStreams) {
      const newImageUrl = generateStreamThumbnailUrl(stream.stream_id, stream.title);
      // console.log(`  - Overwriting stream ID ${stream.stream_id} with URL: ${newImageUrl}`);
      try {
        await stream.update({ thumbnail_url: newImageUrl }, { transaction: t });
        updatedCount++;
      } catch (innerError) {
        console.error(`  - FAILED to update stream ID ${stream.stream_id}: ${innerError.message}`);
        failedCount++;
      }
    }

    await t.commit();
    console.log(`Stream Thumbnails: Transaction COMMITTED. Successfully overwrote ${updatedCount} URLs. Failed: ${failedCount}.`);
  } catch (error) {
    if (t.finished !== 'commit' && t.finished !== 'rollback') {
        await t.rollback();
    }
    console.error('! CRITICAL ERROR during stream thumbnail overwrite, transaction ROLLED BACK (if active).', error);
    failedCount = (await Stream.count({ transaction: t.finished === 'rollback' ? null : t })) - updatedCount;
  }
  return { updatedCount, failedCount };
}

async function runOverwriteAllScript() {
  console.warn('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
  console.warn('!!! WARNING: THIS SCRIPT WILL OVERWRITE ALL USER PROFILE !!!');
  console.warn('!!! PICTURES AND STREAM THUMBNAILS WITH GENERATED ONES.  !!!');
  console.warn('!!! MAKE SURE YOU HAVE A DATABASE BACKUP.                !!!');
  console.warn('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');

  // Add a small delay and a prompt for extra safety in a real scenario,
  // or require a command-line argument. For this example, direct call.
  // For now, just log a countdown.
  console.log("Proceeding in 5 seconds...");
  await new Promise(resolve => setTimeout(resolve, 5000));


  console.log('--- Starting OVERWRITE ALL Images Script ---');
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    const userResults = await overwriteAllUserProfilePictures();
    const streamResults = await overwriteAllStreamThumbnails();

    console.log('\n--- OVERWRITE ALL Images Summary ---');
    const uUpdated = userResults?.updatedCount || 0;
    const uFailed = userResults?.failedCount || (userResults?.error ? 'Many (see logs)' : 0);
    const sUpdated = streamResults?.updatedCount || 0;
    const sFailed = streamResults?.failedCount || (streamResults?.error ? 'Many (see logs)' : 0);

    console.log(`Users - Overwritten: ${uUpdated}, Failed: ${uFailed}`);
    console.log(`Streams - Overwritten: ${sUpdated}, Failed: ${sFailed}`);
    console.log('------------------------------------');

  } catch (error) {
    console.error('Critical error during OVERWRITE ALL script or DB connection:', error);
  } finally {
    if (sequelize && sequelize.close) {
      try {
        await sequelize.close();
        console.log('Database connection closed. OVERWRITE ALL script finished.');
      } catch (closeError) {
        console.error('Error closing database connection:', closeError);
      }
    }
  }
}

runOverwriteAllScript();

export { runOverwriteAllScript, overwriteAllUserProfilePictures, overwriteAllStreamThumbnails };