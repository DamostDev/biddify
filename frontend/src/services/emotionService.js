const API_ENDPOINT = 'https://lawlabi-hopeitworks.hf.space/predict';

/**
 * Analyzes the emotion of a given text string using the Hugging Face model.
 * @param {string} text - The text to analyze (e.g., a chat message).
 * @param {number} threshold - The confidence threshold for the model.
 * @returns {Promise<object>} - The API response with emotion scores.
 */
const analyzeEmotion = async (text, threshold = 0.18) => {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return Promise.resolve(null); // Don't analyze empty messages
  }

  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, threshold }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`API request failed with status ${response.status}: ${errorBody}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Emotion analysis service error:', error);
    // Re-throw to be caught by the caller in StreamPage
    throw error;
  }
};

const emotionService = {
  analyzeEmotion,
};

export default emotionService;