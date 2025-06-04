// backend/src/ml_pipeline/preprocessing/preprocessInteractions.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Helper to get __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT_FILE_PATH = path.join(__dirname, './recommender_interactions.json');
const OUTPUT_FILE_PATH = path.join(__dirname, 'processed_interactions.json');

// Define interaction strengths
const INTERACTION_STRENGTHS = {
  'purchase': 5,
  'like': 4,
  'view': 1,
  // Add other types as you extract them, e.g.:
  // 'bid_win': 4,
  // 'bid_lose': 2,
  // 'follow_seller': 3,
  // 'stream_like': 4,
  // 'stream_view_long': 2,
  // 'stream_view_short': 1,
};

function preprocessInteractions() {
  console.log(`Reading interactions from: ${INPUT_FILE_PATH}`);
  if (!fs.existsSync(INPUT_FILE_PATH)) {
    console.error(`ERROR: Input file not found: ${INPUT_FILE_PATH}`);
    console.error('Please run the data extraction script first.');
    return;
  }

  const rawInteractions = JSON.parse(fs.readFileSync(INPUT_FILE_PATH, 'utf-8'));
  console.log(`Read ${rawInteractions.length} raw interactions.`);

  const processedInteractions = [];
  let skippedCount = 0;

  for (const interaction of rawInteractions) {
    // Basic validation
    if (interaction.user_id == null || interaction.product_id == null) {
      console.warn(`Skipping interaction due to missing user_id or product_id:`, interaction);
      skippedCount++;
      continue;
    }

    const strength = INTERACTION_STRENGTHS[interaction.interaction_type];

    if (strength === undefined) {
      console.warn(`Skipping interaction due to unknown interaction_type: '${interaction.interaction_type}'`, interaction);
      skippedCount++;
      continue;
    }

    processedInteractions.push({
      user_id: Number(interaction.user_id), // Ensure IDs are numbers
      product_id: Number(interaction.product_id), // Ensure IDs are numbers
      interaction_type: interaction.interaction_type,
      interaction_strength: strength,
      timestamp: interaction.timestamp,
      // Keep optional fields if they exist and you want them
      ...(interaction.duration_ms && { duration_ms: interaction.duration_ms }),
    });
  }

  console.log(`Processed ${processedInteractions.length} interactions.`);
  if (skippedCount > 0) {
    console.log(`Skipped ${skippedCount} interactions due to missing data or unknown type.`);
  }

  fs.writeFileSync(OUTPUT_FILE_PATH, JSON.stringify(processedInteractions, null, 2));
  console.log(`Processed interactions written to: ${OUTPUT_FILE_PATH}`);

  if (processedInteractions.length > 0) {
      console.log(`\n--- Sample of Processed Data (first 5) ---`);
      console.log(processedInteractions.slice(0, 5));
  }
}

// Run the preprocessing
preprocessInteractions();