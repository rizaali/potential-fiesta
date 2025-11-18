/**
 * Calculate cosine similarity between two embedding vectors
 * @param {number[]} vec1 - First embedding vector
 * @param {number[]} vec2 - Second embedding vector
 * @returns {number} Similarity score between -1 and 1 (higher = more similar)
 */
export function cosineSimilarity(vec1, vec2) {
  if (!vec1 || !vec2 || vec1.length !== vec2.length) {
    return 0;
  }

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }

  const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
  if (denominator === 0) {
    return 0;
  }

  return dotProduct / denominator;
}

/**
 * Build graph data structure from journal entries with embeddings
 * @param {Array} entries - Array of journal entries with embeddings
 * @param {number} similarityThreshold - Minimum similarity to create an edge (0-1)
 * @returns {Object} Graph data with nodes and links
 */
export function buildKnowledgeGraph(entries, similarityThreshold = 0.7) {
  const nodes = entries
    .filter(entry => entry.embedding && Array.isArray(entry.embedding))
    .map((entry, index) => ({
      id: entry.id,
      title: entry.title,
      content: entry.content,
      createdAt: entry.created_at,
      embedding: entry.embedding,
      index: index,
    }));

  const links = [];
  
  // Calculate similarities between all pairs of entries
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const similarity = cosineSimilarity(nodes[i].embedding, nodes[j].embedding);
      
      if (similarity >= similarityThreshold) {
        links.push({
          source: nodes[i].id,
          target: nodes[j].id,
          similarity: similarity,
          value: similarity, // For link thickness
        });
      }
    }
  }

  return {
    nodes,
    links,
  };
}

/**
 * Get emotion/keyword class for a node based on entry content
 * @param {string} title - Entry title
 * @param {string} content - Entry content
 * @returns {string} Color class for the node
 */
export function getNodeColor(title, content) {
  const textToCheck = `${title} ${content}`.toLowerCase();

  if (textToCheck.includes('happy')) return '#fbbf24'; // yellow
  if (textToCheck.includes('sad')) return '#60a5fa'; // blue
  if (textToCheck.includes('angry')) return '#f87171'; // red
  if (textToCheck.includes('sleepy')) return '#ffffff'; // white
  if (textToCheck.includes('jealous')) return '#4ade80'; // green
  if (textToCheck.includes('royal')) return '#a78bfa'; // purple

  return '#9ca3af'; // default gray
}

