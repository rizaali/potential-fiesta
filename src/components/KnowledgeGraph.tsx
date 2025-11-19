'use client';

import { useCallback, useRef, useState } from 'react';
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
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleNodeClick = useCallback((node: GraphNode) => {
    if (onNodeClick) {
      onNodeClick(node);
    }
  }, [onNodeClick]);

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
        if (hoveredLink && containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          setTooltipPosition({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
          });
        }
      }}
    >
      <ForceGraph2D
        ref={graphRef}
        graphData={{ nodes, links }}
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
        onEngineStop={() => {
          if (graphRef.current) {
            graphRef.current.zoomToFit(400, 20);
          }
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
          } else {
            setHoveredLink(null);
          }
        }}
        onBackgroundClick={() => setHoveredLink(null)}
      />
      {/* Link similarity tooltip */}
      {hoveredLink && (
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
          Click nodes to view details • Hover links to see similarity • Drag to explore
        </p>
      </div>
    </div>
  );
}

