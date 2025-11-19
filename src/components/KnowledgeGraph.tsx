'use client';

import { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { getNodeColor } from '@/lib/graphUtils';

// Dynamically import react-force-graph-2d to avoid SSR issues
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
});

interface JournalEntry {
  id: string;
  title: string;
  content: string;
  created_at: string;
  embedding?: number[];
}

interface GraphNode {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  index: number;
}

interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  similarity: number;
  value: number;
  strength?: 'strong' | 'medium' | 'weak';
  isDotted?: boolean;
}

interface KnowledgeGraphProps {
  nodes: GraphNode[];
  links: GraphLink[];
  onNodeClick?: (node: GraphNode) => void;
}

export default function KnowledgeGraph({ nodes, links, onNodeClick }: KnowledgeGraphProps) {
  const graphRef = useRef<any>(null);
  const [hoveredLink, setHoveredLink] = useState<any>(null);
  const [clickedLink, setClickedLink] = useState<any>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loadingExplanation, setLoadingExplanation] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const hasZoomedToFit = useRef<boolean>(false);
  const mouseMoveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tooltipPositionRef = useRef({ x: 0, y: 0 });
  
  // Cache for explanations to avoid repeated API calls
  const explanationCache = useRef<Map<string, string>>(new Map());

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (mouseMoveTimeoutRef.current) {
        clearTimeout(mouseMoveTimeoutRef.current);
      }
    };
  }, []);

  // Memoize graph data to prevent unnecessary re-renders
  const graphData = useMemo(() => ({ nodes, links }), [nodes, links]);

  // Zoom to fit only once when graph first loads
  useEffect(() => {
    if (graphRef.current && !hasZoomedToFit.current && nodes.length > 0) {
      hasZoomedToFit.current = true;
      // Wait for graph to render before zooming
      const timer = setTimeout(() => {
        if (graphRef.current) {
          graphRef.current.zoomToFit(400, 20);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [nodes.length]);

  const handleNodeClick = useCallback((node: GraphNode) => {
    if (onNodeClick) {
      onNodeClick(node);
    }
  }, [onNodeClick]);

  // Function to get entry ID from link source/target (handles both string and object formats)
  const getEntryId = (sourceOrTarget: string | GraphNode): string => {
    if (typeof sourceOrTarget === 'string') {
      return sourceOrTarget;
    }
    return sourceOrTarget.id;
  };

  // Fetch similarity explanation from API
  const fetchSimilarityExplanation = useCallback(async (link: any) => {
    const sourceId = getEntryId(link.source);
    const targetId = getEntryId(link.target);
    
    // Create cache key (sorted to handle both directions)
    const cacheKey = [sourceId, targetId].sort().join('-');
    
    // Check cache first
    if (explanationCache.current.has(cacheKey)) {
      const cachedExplanation = explanationCache.current.get(cacheKey);
      if (cachedExplanation) {
        setExplanation(cachedExplanation);
        return;
      }
    }

    setLoadingExplanation(true);
    setExplanation(null);

    try {
      const response = await fetch('/api/explain-similarity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId: sourceId,
          targetId: targetId,
          similarity: link.similarity, // Include similarity score for AI context
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      const explanationText = result.explanation || 'Unable to generate explanation.';
      
      // Cache the explanation
      explanationCache.current.set(cacheKey, explanationText);
      setExplanation(explanationText);
    } catch (error: any) {
      console.error('[Graph] Error fetching explanation:', error);
      setExplanation(`Error: ${error.message || 'Failed to load explanation'}`);
    } finally {
      setLoadingExplanation(false);
    }
  }, []);

  // Handle link click
  const handleLinkClick = useCallback((link: any, event: any) => {
    event.stopPropagation(); // Prevent background click
    setClickedLink(link);
    fetchSimilarityExplanation(link);
  }, [fetchSimilarityExplanation]);

  if (!nodes || nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full min-h-[600px] bg-zinc-50 dark:bg-zinc-900 rounded-lg">
        <p className="text-zinc-500 dark:text-zinc-400">
          No entries with embeddings available. Create some entries to see the knowledge graph!
        </p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="w-full h-full min-h-[600px] bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden relative"
      onMouseMove={(e) => {
        // Update tooltip position using ref to avoid re-renders
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const newPos = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
          };
          tooltipPositionRef.current = newPos;
          // Only update state if tooltip is visible (triggers re-render for positioning)
          // Use requestAnimationFrame to batch updates
          if (hoveredLink || clickedLink) {
            requestAnimationFrame(() => {
              setTooltipPosition(newPos);
            });
          }
        }
      }}
      onMouseLeave={() => {
        // Clear tooltips when mouse leaves the container
        setHoveredLink(null);
        if (!clickedLink) {
          setExplanation(null);
        }
      }}
    >
      <ForceGraph2D
        ref={graphRef}
        graphData={graphData}
        nodeLabel={(node: any) => `${(node as GraphNode).title || node.id}`}
        nodeColor={(node: any) => {
          // Get color based on entry content
          const graphNode = node as GraphNode;
          const textToCheck = `${graphNode.title || ''} ${graphNode.content || ''}`.toLowerCase();
          return getNodeColor(graphNode.title || '', graphNode.content || '');
        }}
        nodeVal={(node: any) => {
          // Node size based on number of connections
          const graphNode = node as GraphNode;
          const connections = links.filter(
            (link) => link.source === graphNode.id || link.target === graphNode.id
          ).length;
          return Math.max(5, Math.min(20, 5 + connections * 2));
        }}
        linkColor={(link: any) => {
          // Use vibrant colors that work on both light and dark backgrounds
          const strength = link.strength || 'medium';
          if (strength === 'strong') {
            return 'rgba(34, 197, 94, 0.8)'; // Bright green for strong connections
          } else if (strength === 'medium') {
            return 'rgba(59, 130, 246, 0.7)'; // Bright blue for medium connections
          } else {
            return 'rgba(236, 72, 153, 0.6)'; // Pink for weak connections
          }
        }}
        linkWidth={(link: any) => {
          // Use strength categories for visual differentiation
          const strength = link.strength || 'medium';
          if (strength === 'strong') {
            return 4; // Bold lines for strong connections
          } else if (strength === 'medium') {
            return 2; // Medium lines for medium connections
          } else {
            return 1; // Thin lines for weak connections
          }
        }}
        linkDirectionalArrowLength={6}
        linkDirectionalArrowRelPos={1}
        linkCurvature={0.2}
        linkCanvasObject={(link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
          // Draw custom link with dashed pattern for weak connections
          const isDotted = link.isDotted || false;
          const strength = link.strength || 'medium';
          
          // Get link coordinates
          const start = typeof link.source === 'object' ? link.source : null;
          const end = typeof link.target === 'object' ? link.target : null;
          
          if (!start || !end || !start.x || !start.y || !end.x || !end.y) {
            return; // Skip if coordinates are not available
          }
          
          // Set line style based on strength
          let lineWidth;
          let color;
          
          if (strength === 'strong') {
            lineWidth = 4;
            color = 'rgba(34, 197, 94, 0.8)'; // Bright green
          } else if (strength === 'medium') {
            lineWidth = 2;
            color = 'rgba(59, 130, 246, 0.7)'; // Bright blue
          } else {
            lineWidth = 1;
            color = 'rgba(236, 72, 153, 0.6)'; // Pink
          }
          
          ctx.strokeStyle = color;
          ctx.lineWidth = lineWidth;
          
          // Set dash pattern for weak connections
          if (isDotted) {
            ctx.setLineDash([5, 5]); // 5px dash, 5px gap
          } else {
            ctx.setLineDash([]); // Solid line
          }
          
          // Draw the line
          ctx.beginPath();
          ctx.moveTo(start.x, start.y);
          ctx.lineTo(end.x, end.y);
          ctx.stroke();
          
          // Draw arrow for directional links
          const arrowLength = 6;
          const arrowRelPos = 1; // Position at end of link
          const dx = end.x - start.x;
          const dy = end.y - start.y;
          const angle = Math.atan2(dy, dx);
          const arrowX = start.x + dx * arrowRelPos;
          const arrowY = start.y + dy * arrowRelPos;
          
          // Draw arrowhead
          ctx.beginPath();
          ctx.moveTo(arrowX, arrowY);
          ctx.lineTo(
            arrowX - arrowLength * Math.cos(angle - Math.PI / 6),
            arrowY - arrowLength * Math.sin(angle - Math.PI / 6)
          );
          ctx.moveTo(arrowX, arrowY);
          ctx.lineTo(
            arrowX - arrowLength * Math.cos(angle + Math.PI / 6),
            arrowY - arrowLength * Math.sin(angle + Math.PI / 6)
          );
          ctx.stroke();
          
          // Reset line dash
          ctx.setLineDash([]);
        }}
        linkCanvasObjectMode={() => 'replace'} // Replace default link rendering
        onNodeClick={(node: any) => {
          handleNodeClick(node as GraphNode);
        }}
        cooldownTicks={100}
        // Disable onEngineStop zoom to prevent bouncing - zoom only on initial mount
        onEngineStop={() => {
          // Do nothing - zoom is handled on mount via useEffect
        }}
        nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
          const label = (node as GraphNode).title || node.id;
          const fontSize = Math.max(10, 12 / globalScale); // Minimum readable size
          ctx.font = `${fontSize}px Sans-Serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          // Use white text with dark outline for visibility on all backgrounds
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
          ctx.lineWidth = 3;
          ctx.fillStyle = 'rgba(255, 255, 255, 1)';
          const x = node.x || 0;
          const y = node.y || 0;
          // Draw text centered on node
          ctx.strokeText(label, x, y);
          ctx.fillText(label, x, y);
        }}
        nodeCanvasObjectMode={() => 'after'}
        onLinkHover={(link: any, prevLink: any) => {
          if (link) {
            setHoveredLink(link);
            // Update tooltip position immediately when hovering
            setTooltipPosition(tooltipPositionRef.current);
          } else {
            // Clear hovered link when mouse leaves (but keep clicked link tooltip)
            setHoveredLink(null);
          }
        }}
        onLinkClick={handleLinkClick}
        onBackgroundClick={() => {
          setHoveredLink(null);
          setClickedLink(null);
          setExplanation(null);
        }}
      />
      {/* Link similarity tooltip - shows on hover */}
      {hoveredLink && !clickedLink && (
        <div
          className="absolute bg-white dark:bg-zinc-800 px-3 py-2 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700 text-sm pointer-events-none z-10"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            transform: 'translate(-50%, -100%)',
            marginTop: '-8px',
          }}
        >
          <p className="text-zinc-900 dark:text-zinc-100 font-medium">
            Similarity: {(hoveredLink.similarity * 100).toFixed(1)}%
          </p>
          <p className="text-zinc-600 dark:text-zinc-400 text-xs mt-1">
            {hoveredLink.strength === 'strong' && 'Strong connection'}
            {hoveredLink.strength === 'medium' && 'Medium connection'}
            {hoveredLink.strength === 'weak' && 'Weak connection'}
          </p>
          <p className="text-zinc-500 dark:text-zinc-500 text-[10px] mt-2 italic">
            Click link for AI explanation
          </p>
        </div>
      )}
      
      {/* Link explanation tooltip - shows after click */}
      {clickedLink && (
        <div
          className="absolute bg-white dark:bg-zinc-800 px-4 py-3 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700 text-sm pointer-events-none z-10 max-w-md"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            transform: 'translate(-50%, -100%)',
            marginTop: '-8px',
          }}
        >
          <p className="text-zinc-900 dark:text-zinc-100 font-medium mb-2">
            Similarity: {(clickedLink.similarity * 100).toFixed(1)}%
          </p>
          {loadingExplanation ? (
            <p className="text-zinc-600 dark:text-zinc-400 text-xs italic">
              Analyzing connection...
            </p>
          ) : explanation ? (
            <p className="text-zinc-700 dark:text-zinc-300 text-xs leading-relaxed">
              {explanation}
            </p>
          ) : (
            <p className="text-zinc-600 dark:text-zinc-400 text-xs italic">
              Click link to see explanation
            </p>
          )}
        </div>
      )}
      <div className="absolute bottom-4 left-4 bg-white dark:bg-zinc-800 p-3 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700 text-xs">
        <p className="text-zinc-600 dark:text-zinc-400 mb-1">
          <strong>Nodes:</strong> {nodes.length} entries
        </p>
        <p className="text-zinc-600 dark:text-zinc-400 mb-1">
          <strong>Connections:</strong> {links.length} relationships
        </p>
        <p className="text-zinc-500 dark:text-zinc-500 text-[10px] mt-2">
          Click nodes to view details • Click links for AI explanation • Drag to explore
        </p>
      </div>
    </div>
  );
}

