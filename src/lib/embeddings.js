import { pipeline } from '@xenova/transformers';

// Initialize the feature-extraction pipeline with the all-MiniLM-L6-v2 model
// Cache the pipeline to avoid re-initialization on each request
let embeddingPipeline = null;

/**
 * Initialize the embedding pipeline if not already initialized
 * @returns {Promise} The initialized pipeline
 */
async function getEmbeddingPipeline() {
  if (!embeddingPipeline) {
    embeddingPipeline = await pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2'
    );
  }
  return embeddingPipeline;
}

/**
 * Generate a 384-dimensional embedding vector for the given text
 * @param {string} text - The text to generate an embedding for
 * @returns {Promise<number[]>} A 384-dimensional array of floats
 */
export async function generateEmbedding(text) {
  try {
    // Get or initialize the pipeline
    const extractor = await getEmbeddingPipeline();
    
    // Generate the embedding
    const output = await extractor(text, {
      pooling: 'mean',
      normalize: true,
    });
    
    // Convert tensor to JavaScript array
    // @xenova/transformers returns a tensor object with .data property
    let embedding;
    
    // Handle different possible output formats
    if (output && typeof output.data !== 'undefined') {
      // Standard tensor format with .data property
      embedding = Array.from(output.data);
    } else if (Array.isArray(output)) {
      // Already an array
      embedding = output;
    } else if (output && typeof output.tolist === 'function') {
      // Has tolist method
      embedding = output.tolist();
    } else if (output && output.tensor) {
      // Nested tensor property
      embedding = Array.from(output.tensor.data);
    } else {
      // Fallback: try to extract as array
      const data = output?.data || output;
      embedding = Array.isArray(data) ? data : Array.from(data || []);
    }
    
    // Flatten if nested (e.g., [[1,2,3]] -> [1,2,3])
    if (Array.isArray(embedding[0]) && embedding.length === 1) {
      embedding = embedding[0];
    }
    
    // Ensure we have exactly 384 dimensions
    if (embedding.length !== 384) {
      console.warn(`Expected 384 dimensions, got ${embedding.length}. Attempting to fix...`);
      // If we got a different size, try to extract the first 384 or pad/truncate
      if (embedding.length > 384) {
        embedding = embedding.slice(0, 384);
      } else if (embedding.length < 384) {
        // This shouldn't happen with all-MiniLM-L6-v2, but handle it
        throw new Error(`Embedding dimension mismatch: got ${embedding.length}, expected 384`);
      }
    }
    
    return embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error(`Failed to generate embedding: ${error.message}`);
  }
}

