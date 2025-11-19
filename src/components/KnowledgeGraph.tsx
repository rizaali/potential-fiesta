'use client';

import { useCallback, useRef } from 'react';
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
    <div className="w-full h-full min-h-[600px] bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden relative">
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
          // Vary color slightly by strength for better visual differentiation
          const strength = link.strength || 'medium';
          if (strength === 'strong') {
            return 'rgba(59, 130, 246, 0.6)'; // Blue for strong connections
          } else if (strength === 'medium') {
            return 'rgba(156, 163, 175, 0.5)'; // Gray for medium connections
          } else {
            return 'rgba(156, 163, 175, 0.3)'; // Lighter gray for weak connections
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
        linkStrokeDasharray={(link: any) => {
          // Dotted lines for weak connections, solid for strong/medium
          const isDotted = link.isDotted || false;
          return isDotted ? '5,5' : undefined; // 5px dash, 5px gap for dotted lines
        }}
        linkDirectionalArrowLength={6}
        linkDirectionalArrowRelPos={1}
        linkCurvature={0.2}
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
          const fontSize = 12 / globalScale;
          ctx.font = `${fontSize}px Sans-Serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
          ctx.fillText(label, node.x || 0, (node.y || 0) + 8);
        }}
        nodeCanvasObjectMode={() => 'after'}
      />
      <div className="absolute bottom-4 left-4 bg-white dark:bg-zinc-800 p-3 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700 text-xs">
        <p className="text-zinc-600 dark:text-zinc-400 mb-1">
          <strong>Nodes:</strong> {nodes.length} entries
        </p>
        <p className="text-zinc-600 dark:text-zinc-400 mb-1">
          <strong>Connections:</strong> {links.length} relationships
        </p>
        <p className="text-zinc-500 dark:text-zinc-500 text-[10px] mt-2">
          Click nodes to view details • Drag to explore
        </p>
      </div>
    </div>
  );
}

