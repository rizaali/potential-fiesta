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
 * Uses cosine similarity to compare all entry pairs and creates links with visual styling
 * based on similarity strength. Connections are deterministic (same entries = same connections).
 * 
 * @param {Array} entries - Array of journal entries with embeddings
 * @param {number} minSimilarity - Minimum similarity to create a link (default: 0.4)
 * @returns {Object} Graph data with nodes and links
 */
export function buildKnowledgeGraph(entries, minSimilarity = 0.4) {
  // Sort entries by ID for deterministic ordering (same entries always produce same graph)
  const sortedEntries = [...entries]
    .filter(entry => entry.embedding && Array.isArray(entry.embedding))
    .sort((a, b) => {
      // Sort by ID to ensure deterministic ordering
      if (a.id < b.id) return -1;
      if (a.id > b.id) return 1;
      return 0;
    });

  const nodes = sortedEntries.map((entry, index) => ({
    id: entry.id,
    title: entry.title,
    content: entry.content,
    createdAt: entry.created_at,
    embedding: entry.embedding,
    index: index,
  }));

  const links = [];
  
  // Calculate cosine similarity between all pairs of entries
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      // Use cosine similarity to compare embeddings
      const similarity = cosineSimilarity(nodes[i].embedding, nodes[j].embedding);
      
      // Only create links for entries with similarity >= minimum threshold
      if (similarity >= minSimilarity) {
        links.push({
          source: nodes[i].id,
          target: nodes[j].id,
          similarity: similarity, // Store actual cosine similarity score (0-1)
          value: similarity, // For link thickness calculation
        });
      }
      // No link created if similarity < minSimilarity (default 0.4)
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

