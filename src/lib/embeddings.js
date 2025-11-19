import OpenAI from 'openai';

// Initialize OpenAI client
// The API key should be set in environment variables (OPENAI_API_KEY)
// For Vercel: Set OPENAI_API_KEY in Environment Variables
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate an embedding vector for the given text using OpenAI
 * Note: text-embedding-3-small produces 1536-dimensional embeddings
 * @param {string} text - The text to generate an embedding for
 * @returns {Promise<number[]>} An embedding array (1536 dimensions for text-embedding-3-small)
 */
export async function generateEmbedding(text) {
  const startTime = Date.now();
  
  try {
    // Validate input
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      throw new Error('Text input is required and must be a non-empty string');
    }

    // Validate API key
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set. Please set it in your Vercel environment variables.');
    }

    console.log('[Embeddings] Starting OpenAI embedding generation for text length:', text.length);
    
    // Generate embedding using OpenAI
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text.trim(),
    });

    if (!response || !response.data || !response.data[0] || !response.data[0].embedding) {
      throw new Error('Invalid response from OpenAI API');
    }

    const embedding = response.data[0].embedding;
    
    // Validate embedding
    if (!Array.isArray(embedding)) {
      throw new Error(`Invalid embedding format: expected array, got ${typeof embedding}`);
    }
    
    // text-embedding-3-small produces 1536-dimensional embeddings
    const expectedDimensions = 1536;
    if (embedding.length !== expectedDimensions) {
      throw new Error(`Invalid embedding dimensions: expected ${expectedDimensions}, got ${embedding.length}`);
    }
    
    // Validate all values are numbers
    const invalidValues = embedding.filter(v => typeof v !== 'number' || isNaN(v));
    if (invalidValues.length > 0) {
      throw new Error(`Embedding contains ${invalidValues.length} invalid (non-number or NaN) values`);
    }
    
    const duration = Date.now() - startTime;
    console.log(`[Embeddings] Successfully generated ${embedding.length}-dimensional embedding in ${duration}ms`);
    
    return embedding;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[Embeddings] Error generating embedding (took ${duration}ms):`, error);
    console.error('[Embeddings] Error message:', error.message);
    console.error('[Embeddings] Error stack:', error.stack);
    
    // Provide helpful error messages
    if (error.message?.includes('API key')) {
      throw new Error('OpenAI API key is missing or invalid. Please set OPENAI_API_KEY in your Vercel environment variables.');
    } else if (error.message?.includes('quota') || error.message?.includes('billing')) {
      throw new Error('OpenAI API quota exceeded. Please check your OpenAI account billing.');
    } else {
      throw new Error(`Failed to generate embedding: ${error.message}`);
    }
  }
}
