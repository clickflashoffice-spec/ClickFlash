import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Define custom node types if necessary
const nodeTypes = {};

// Initial mock data for the AI Swarm visualization
const initialNodes: Node[] = [
  { id: 'master', position: { x: 250, y: 0 }, data: { label: 'Master Studio OS' }, type: 'input' },
  { id: 'touch-1', position: { x: 100, y: 100 }, data: { label: 'Touch Kiosk 1' } },
  { id: 'touch-2', position: { x: 400, y: 100 }, data: { label: 'Touch Kiosk 2' } },
  { id: 'cloud', position: { x: 250, y: 200 }, data: { label: 'Cloudflare Edge API' } },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: 'master', target: 'touch-1', animated: true },
  { id: 'e1-3', source: 'master', target: 'touch-2', animated: true },
  { id: 'e2-4', source: 'touch-1', target: 'cloud', animated: true },
  { id: 'e3-4', source: 'touch-2', target: 'cloud', animated: true },
];

export function SwarmFlow() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds: Edge[]) => addEdge(params, eds)),
    [setEdges],
  );

  return (
    <div className={twMerge(clsx("w-full h-full min-h-[600px] border border-border/40 rounded-xl overflow-hidden bg-background"))}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        className="bg-muted/10"
      >
        <Controls />
        <MiniMap zoomable pannable nodeStrokeColor="#4b5563" nodeColor="#1f2937" maskColor="rgba(0, 0, 0, 0.1)" />
        <Background gap={12} size={1} />
      </ReactFlow>
    </div>
  );
}
