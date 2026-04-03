'use client';

import { useCallback, useRef, useState, DragEvent } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useWorkflowStore, WorkflowNode } from '@/store/workflowStore';
import { StartNode } from './CustomNodes/StartNode';
import { EndNode } from './CustomNodes/EndNode';
import { PhaseNode } from './CustomNodes/PhaseNode';
import { ApprovalNode } from './CustomNodes/ApprovalNode';

const nodeTypes = {
  start: StartNode,
  end: EndNode,
  phase: PhaseNode,
  approval: ApprovalNode,
};

function WorkflowCanvasInner() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const { screenToFlowPosition } = useReactFlow();

  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    setSelectedNodeId,
    addPhaseNode,
    addApprovalNode,
    deleteNode,
  } = useWorkflowStore();

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: WorkflowNode) => {
      setSelectedNodeId(node.id);
    },
    [setSelectedNodeId]
  );

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, [setSelectedNodeId]);

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
      }
    },
    [screenToFlowPosition, addPhaseNode, addApprovalNode]
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        const selectedNodeId = useWorkflowStore.getState().selectedNodeId;
        if (selectedNodeId && selectedNodeId !== 'start' && selectedNodeId !== 'end') {
          deleteNode(selectedNodeId);
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
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        snapToGrid
        snapGrid={[15, 15]}
        deleteKeyCode={null}
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
    </div>
  );
}

export function WorkflowCanvas() {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner />
    </ReactFlowProvider>
  );
}
