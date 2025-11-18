import OpenAI from 'openai';

// Initialize OpenAI client
// API key should be stored in OPENAI_API_KEY environment variable
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate an embedding vector for the given text using OpenAI's API
 * Uses text-embedding-3-small model which produces 1536-dimensional embeddings
 * @param {string} text - The text to generate an embedding for
 * @returns {Promise<number[]>} A 1536-dimensional array of floats
 */
export async function generateEmbedding(text) {
  const startTime = Date.now();
  
  try {
    // Validate input
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      throw new Error('Text input is required and must be a non-empty string');
    }

    // Validate API key is present
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }

    console.log('[Embeddings] Starting OpenAI embedding generation for text length:', text.length);
    
    // Call OpenAI embeddings API
    let response;
    try {
      response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text.trim(),
      });
      console.log('[Embeddings] OpenAI API call successful');
    } catch (apiError) {
      console.error('[Embeddings] OpenAI API call failed:', apiError);
      console.error('[Embeddings] API error type:', apiError.constructor.name);
      console.error('[Embeddings] API error message:', apiError.message);
      console.error('[Embeddings] API error stack:', apiError.stack);
      
      // Handle specific OpenAI API errors
      if (apiError.status === 401) {
        throw new Error('OpenAI API authentication failed. Please check your API key.');
      } else if (apiError.status === 429) {
        throw new Error('OpenAI API rate limit exceeded. Please try again later.');
      } else if (apiError.status === 500) {
        throw new Error('OpenAI API server error. Please try again later.');
      } else {
        throw new Error(`OpenAI API error: ${apiError.message}`);
      }
    }

    // Extract embedding from response
    if (!response || !response.data || !Array.isArray(response.data) || response.data.length === 0) {
      throw new Error('Invalid response from OpenAI API: missing or empty data');
    }

    const embedding = response.data[0].embedding;
    
    if (!embedding || !Array.isArray(embedding)) {
      throw new Error('Invalid embedding format: expected array, got ' + typeof embedding);
    }

    console.log('[Embeddings] Extracted embedding, length:', embedding.length);
    console.log('[Embeddings] First few values:', embedding.slice(0, 5));
    
    // Validate embedding dimensions (text-embedding-3-small produces 1536 dimensions)
    const expectedDimensions = 1536;
    if (embedding.length !== expectedDimensions) {
      console.warn(`[Embeddings] Expected ${expectedDimensions} dimensions, got ${embedding.length}`);
      // OpenAI should always return the correct dimensions, but handle edge cases
      if (embedding.length < expectedDimensions) {
        throw new Error(`Embedding dimension mismatch: got ${embedding.length}, expected ${expectedDimensions}`);
      } else {
        // If somehow we got more, truncate (shouldn't happen)
        console.warn(`[Embeddings] Truncating embedding from ${embedding.length} to ${expectedDimensions} dimensions`);
        embedding = embedding.slice(0, expectedDimensions);
      }
    }
    
    // Final validation
    if (!Array.isArray(embedding) || embedding.length !== expectedDimensions) {
      throw new Error(`Final validation failed: embedding is not a ${expectedDimensions}-element array`);
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
    throw new Error(`Failed to generate embedding: ${error.message}`);
  }
}
