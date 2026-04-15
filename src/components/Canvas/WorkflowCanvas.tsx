'use client';

import { useCallback, useRef, useState, useMemo, DragEvent, memo, ComponentType } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  useReactFlow,
  ReactFlowProvider,
  Edge,
  reconnectEdge,
  Connection,
  NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useWorkflowStore, WorkflowNode, WorkflowEdge } from '@/store/workflowStore';
import { findLoopEdges } from '@/lib/graphUtils';
import { StartNode } from './CustomNodes/StartNode';
import { EndNode } from './CustomNodes/EndNode';
import { PhaseNode } from './CustomNodes/PhaseNode';
import { ApprovalNode } from './CustomNodes/ApprovalNode';
import { DecisionNode } from './CustomNodes/DecisionNode';
import { ClearButton } from './ClearButton';
import { EditableEdge } from './CustomEdges';
import { DirectionalIndicators } from './DirectionalIndicators';
import { RadialNodePicker } from './RadialNodePicker';
import { Direction } from '@/types/workflow';

function withDirectionalIndicators<T extends NodeProps>(
  WrappedComponent: ComponentType<T>
) {
  return memo(function NodeWithIndicators(props: T) {
    const { openRadialMenu } = useWorkflowStore();
    const [isHovered, setIsHovered] = useState(false);
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleMouseEnter = useCallback(() => {
      hoverTimeoutRef.current = setTimeout(() => setIsHovered(true), 150);
    }, []);

    const handleMouseLeave = useCallback(() => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      setIsHovered(false);
    }, []);

    const handleOpenRadialMenu = useCallback(
      (direction: Direction, position: { x: number; y: number }) => {
        openRadialMenu(props.id, direction, position);
      },
      [props.id, openRadialMenu]
    );

    return (
      <div
        className="relative"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <WrappedComponent {...props} />
        <DirectionalIndicators
          node={props as unknown as WorkflowNode}
          onOpenRadialMenu={handleOpenRadialMenu}
          isHovered={isHovered}
        />
      </div>
    );
  });
}

const nodeTypes = {
  start: withDirectionalIndicators(StartNode),
  end: withDirectionalIndicators(EndNode),
  phase: withDirectionalIndicators(PhaseNode),
  approval: withDirectionalIndicators(ApprovalNode),
  decision: withDirectionalIndicators(DecisionNode),
};

const edgeTypes = {
  default: EditableEdge,
};

function WorkflowCanvasInner({ onClearClick }: { onClearClick: () => void }) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const edgeReconnectSuccessful = useRef(true);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const { screenToFlowPosition } = useReactFlow();

  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    setSelectedNodeId,
    setSelectedEdgeId,
    addPhaseNode,
    addApprovalNode,
    addDecisionNode,
    deleteNode,
  } = useWorkflowStore();

  // Compute which edges are loops based on graph structure (DFS cycle detection)
  const edgesWithLoopStatus = useMemo(() => {
    const loopEdgeIds = findLoopEdges(nodes, edges);
    return edges.map((edge) => ({
      ...edge,
      data: {
        ...edge.data,
        isLoop: loopEdgeIds.has(edge.id),
      },
    }));
  }, [nodes, edges]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: WorkflowNode) => {
      setSelectedNodeId(node.id);
    },
    [setSelectedNodeId]
  );

  const onEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      setSelectedEdgeId(edge.id);
    },
    [setSelectedEdgeId]
  );

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, [setSelectedNodeId]);

  // Edge reconnection handlers for drag-and-drop reassignment
  const onReconnectStart = useCallback(() => {
    edgeReconnectSuccessful.current = false;
  }, []);

  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      edgeReconnectSuccessful.current = true;
      useWorkflowStore.setState({
        edges: reconnectEdge(oldEdge, newConnection, edges) as WorkflowEdge[],
      });
    },
    [edges]
  );

  const onReconnectEnd = useCallback(
    (_: MouseEvent | TouchEvent, edge: Edge) => {
      if (!edgeReconnectSuccessful.current) {
        // Edge was dropped in empty space, delete it
        useWorkflowStore.setState({
          edges: edges.filter((e) => e.id !== edge.id),
        });
      }
      edgeReconnectSuccessful.current = true;
    },
    [edges]
  );

  const handleDragEnter = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (event.dataTransfer.types.includes('application/reactflow')) {
      setIsDraggingOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    // Only set to false if we're actually leaving the container
    const rect = reactFlowWrapper.current?.getBoundingClientRect();
    if (rect) {
      const { clientX, clientY } = event;
      if (
        clientX < rect.left ||
        clientX > rect.right ||
        clientY < rect.top ||
        clientY > rect.bottom
      ) {
        setIsDraggingOver(false);
      }
    }
  }, []);

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDraggingOver(false);

      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      if (type === 'phase') {
        addPhaseNode(position);
      } else if (type === 'approval') {
        addApprovalNode(position);
      } else if (type === 'decision') {
        addDecisionNode(position);
      }
    },
    [screenToFlowPosition, addPhaseNode, addApprovalNode, addDecisionNode]
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        const { selectedNodeId, selectedEdgeId, edges: currentEdges } = useWorkflowStore.getState();
        if (selectedNodeId && selectedNodeId !== 'start' && selectedNodeId !== 'end') {
          deleteNode(selectedNodeId);
        } else if (selectedEdgeId) {
          useWorkflowStore.setState({
            edges: currentEdges.filter((e) => e.id !== selectedEdgeId),
            selectedEdgeId: null,
          });
        }
      }
    },
    [deleteNode]
  );

  return (
    <div
      ref={reactFlowWrapper}
      className="flex-1 h-full relative"
      onKeyDown={onKeyDown}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      tabIndex={0}
    >
      <ReactFlow
        nodes={nodes}
        edges={edgesWithLoopStatus}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        onReconnectStart={onReconnectStart}
        onReconnect={onReconnect}
        onReconnectEnd={onReconnectEnd}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        snapToGrid
        snapGrid={[15, 15]}
        deleteKeyCode={null}
        edgesReconnectable
      >
        <Background gap={15} size={1} />
        <Controls />
        <MiniMap
          nodeStrokeWidth={3}
          zoomable
          pannable
        />
        <Panel position="top-left" className="text-xs text-muted-foreground">
          Drag nodes from sidebar • Click to select • Delete key to remove
        </Panel>
        <Panel position="top-right">
          <ClearButton onClick={onClearClick} />
        </Panel>
      </ReactFlow>

      {/* Drop zone overlay - appears when dragging */}
      {isDraggingOver && (
        <div
          className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary pointer-events-none z-50 flex items-center justify-center"
        >
          <span className="text-primary font-medium bg-background px-3 py-1 rounded">
            Drop here to add node
          </span>
        </div>
      )}

      {/* Radial menu for node spawning */}
      <RadialNodePicker />
    </div>
  );
}

interface WorkflowCanvasProps {
  onClearClick: () => void;
}

export function WorkflowCanvas({ onClearClick }: WorkflowCanvasProps) {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner onClearClick={onClearClick} />
    </ReactFlowProvider>
  );
}
