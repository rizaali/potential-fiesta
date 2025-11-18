import { pipeline } from '@xenova/transformers';

// Initialize the feature-extraction pipeline with the distilbert-base-uncased model
// Cache the pipeline to avoid re-initialization on each request
let embeddingPipeline = null;
let pipelineInitializationError = null;

/**
 * Initialize the embedding pipeline if not already initialized
 * @returns {Promise} The initialized pipeline
 */
async function getEmbeddingPipeline() {
  if (pipelineInitializationError) {
    throw new Error(`Pipeline initialization previously failed: ${pipelineInitializationError.message}`);
  }

  if (!embeddingPipeline) {
    try {
      console.log('[Embeddings] Initializing feature-extraction pipeline with model: Xenova/distilbert-base-uncased');
      embeddingPipeline = await pipeline(
        'feature-extraction',
        'Xenova/distilbert-base-uncased'
      );
      console.log('[Embeddings] Pipeline initialized successfully');
    } catch (error) {
      pipelineInitializationError = error;
      console.error('[Embeddings] Failed to initialize pipeline:', error);
      console.error('[Embeddings] Error stack:', error.stack);
      throw new Error(`Failed to initialize embedding pipeline: ${error.message}`);
    }
  }
  return embeddingPipeline;
}

/**
 * Generate an embedding vector for the given text
 * Note: distilbert-base-uncased produces 768-dimensional embeddings
 * @param {string} text - The text to generate an embedding for
 * @returns {Promise<number[]>} An embedding array (768 dimensions for distilbert-base-uncased)
 */
export async function generateEmbedding(text) {
  const startTime = Date.now();
  
  try {
    // Validate input
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      throw new Error('Text input is required and must be a non-empty string');
    }

    console.log('[Embeddings] Starting embedding generation for text length:', text.length);
    
    // Get or initialize the pipeline
    let extractor;
    try {
      extractor = await getEmbeddingPipeline();
      console.log('[Embeddings] Pipeline retrieved successfully');
    } catch (pipelineError) {
      console.error('[Embeddings] Pipeline retrieval failed:', pipelineError);
      console.error('[Embeddings] Pipeline error stack:', pipelineError.stack);
      throw pipelineError;
    }
    
    // Generate the embedding
    console.log('[Embeddings] Calling extractor with text...');
    let output;
    try {
      output = await extractor(text, {
        pooling: 'mean',
        normalize: true,
      });
      console.log('[Embeddings] Extractor returned output, type:', typeof output);
      console.log('[Embeddings] Output keys:', output ? Object.keys(output) : 'null/undefined');
    } catch (extractionError) {
      console.error('[Embeddings] Extraction failed:', extractionError);
      console.error('[Embeddings] Extraction error stack:', extractionError.stack);
      throw new Error(`Failed to extract embedding: ${extractionError.message}`);
    }

    if (!output) {
      throw new Error('Extractor returned null or undefined output');
    }
    
    // Convert tensor to JavaScript array
    // @xenova/transformers returns a tensor object with .data property
    console.log('[Embeddings] Converting tensor to array...');
    let embedding;
    
    try {
      // Handle different possible output formats
      if (output && typeof output.data !== 'undefined') {
        // Standard tensor format with .data property
        console.log('[Embeddings] Using output.data format');
        embedding = Array.from(output.data);
      } else if (Array.isArray(output)) {
        // Already an array
        console.log('[Embeddings] Output is already an array');
        embedding = output;
      } else if (output && typeof output.tolist === 'function') {
        // Has tolist method
        console.log('[Embeddings] Using tolist() method');
        embedding = output.tolist();
      } else if (output && output.tensor) {
        // Nested tensor property
        console.log('[Embeddings] Using nested tensor.data format');
        embedding = Array.from(output.tensor.data);
      } else {
        // Fallback: try to extract as array
        console.log('[Embeddings] Using fallback extraction method');
        const data = output?.data || output;
        embedding = Array.isArray(data) ? data : Array.from(data || []);
      }
      
      // Flatten if nested (e.g., [[1,2,3]] -> [1,2,3])
      if (Array.isArray(embedding[0]) && embedding.length === 1) {
        console.log('[Embeddings] Flattening nested array');
        embedding = embedding[0];
      }
      
      console.log('[Embeddings] Converted embedding length:', embedding.length);
      console.log('[Embeddings] First few values:', embedding.slice(0, 5));
    } catch (conversionError) {
      console.error('[Embeddings] Tensor conversion failed:', conversionError);
      console.error('[Embeddings] Conversion error stack:', conversionError.stack);
      console.error('[Embeddings] Output structure:', JSON.stringify(output, null, 2).substring(0, 500));
      throw new Error(`Failed to convert tensor to array: ${conversionError.message}`);
    }
    
    // Validate embedding is not null/undefined
    if (!embedding || !Array.isArray(embedding)) {
      throw new Error(`Invalid embedding format: expected array, got ${typeof embedding}`);
    }
    
    // Ensure we have the expected dimensions (768 for distilbert-base-uncased)
    const expectedDimensions = 768;
    if (embedding.length !== expectedDimensions) {
      console.warn(`[Embeddings] Expected ${expectedDimensions} dimensions, got ${embedding.length}. Attempting to fix...`);
      // If we got a different size, try to extract the first N or pad/truncate
      if (embedding.length > expectedDimensions) {
        embedding = embedding.slice(0, expectedDimensions);
        console.log(`[Embeddings] Truncated to ${expectedDimensions} dimensions`);
      } else if (embedding.length < expectedDimensions) {
        // This shouldn't happen with distilbert-base-uncased, but handle it
        throw new Error(`Embedding dimension mismatch: got ${embedding.length}, expected ${expectedDimensions}`);
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
