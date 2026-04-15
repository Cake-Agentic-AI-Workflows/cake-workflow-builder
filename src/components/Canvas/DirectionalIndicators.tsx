'use client';

import { useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useWorkflowStore, WorkflowNode } from '@/store/workflowStore';
import { Direction } from '@/types/workflow';
import { findNearestNodeInDirection, getHandlesForDirection } from '@/utils/spatialUtils';
import { cn } from '@/lib/utils';

interface DirectionalIndicatorsProps {
  node: WorkflowNode;
  onOpenRadialMenu: (direction: Direction, position: { x: number; y: number }) => void;
  isHovered: boolean;
}

const directionIcons = {
  up: ChevronUp,
  down: ChevronDown,
  left: ChevronLeft,
  right: ChevronRight,
};

export function DirectionalIndicators({ node, onOpenRadialMenu, isHovered }: DirectionalIndicatorsProps) {
  const { getNodes } = useReactFlow();
  const { edges, onConnect } = useWorkflowStore();

  // Don't show indicators on EndNode (can't initiate connections)
  if (node.type === 'end') {
    return null;
  }

  const isHandleConnected = useCallback(
    (handleId: string): boolean => {
      return edges.some(
        (edge) => edge.source === node.id && edge.sourceHandle === handleId
      );
    },
    [edges, node.id]
  );

  const handleIndicatorClick = useCallback(
    (direction: Direction, event: React.MouseEvent) => {
      event.stopPropagation();

      const { sourceHandle, targetHandle } = getHandlesForDirection(direction);

      // Check if source handle is already connected
      if (isHandleConnected(sourceHandle)) {
        return;
      }

      const allNodes = getNodes() as WorkflowNode[];

      // Find the actual source node with position data from React Flow
      const sourceNode = allNodes.find(n => n.id === node.id);
      if (!sourceNode) {
        return;
      }

      const targetNode = findNearestNodeInDirection(sourceNode, allNodes, direction);

      if (targetNode) {
        // Connect to existing node
        onConnect({
          source: node.id,
          target: targetNode.id,
          sourceHandle,
          targetHandle,
        });
      } else {
        // Open radial menu to spawn new node
        onOpenRadialMenu(direction, { x: event.clientX, y: event.clientY });
      }
    },
    [node.id, getNodes, onConnect, isHandleConnected, onOpenRadialMenu]
  );

  const getIndicatorPosition = (direction: Direction) => {
    const offset = 24;
    switch (direction) {
      case 'up':
        return { top: -offset, left: '50%', transform: 'translateX(-50%)' };
      case 'down':
        return { bottom: -offset, left: '50%', transform: 'translateX(-50%)' };
      case 'left':
        return { left: -offset, top: '50%', transform: 'translateY(-50%)' };
      case 'right':
        return { right: -offset, top: '50%', transform: 'translateY(-50%)' };
    }
  };

  const directions: Direction[] = ['up', 'down', 'left', 'right'];

  // Filter out directions based on node type constraints
  const availableDirections = directions.filter((direction) => {
    const { sourceHandle } = getHandlesForDirection(direction);

    // StartNode only has bottom output
    if (node.type === 'start' && direction !== 'down') {
      return false;
    }

    // Check if handle is already connected
    if (isHandleConnected(sourceHandle)) {
      return false;
    }

    return true;
  });

  if (!isHovered) {
    return null;
  }

  return (
    <div className="absolute inset-0 pointer-events-none">
      {availableDirections.map((direction) => {
        const Icon = directionIcons[direction];
        const position = getIndicatorPosition(direction);

        return (
          <button
            key={direction}
            className={cn(
              'absolute w-6 h-6 rounded-full',
              'bg-gray-200/80 hover:bg-primary hover:text-white',
              'flex items-center justify-center',
              'pointer-events-auto cursor-pointer',
              'transition-all duration-150',
              'shadow-sm hover:shadow-md'
            )}
            style={position}
            onClick={(e) => handleIndicatorClick(direction, e)}
          >
            <Icon className="w-4 h-4" />
          </button>
        );
      })}
    </div>
  );
}
