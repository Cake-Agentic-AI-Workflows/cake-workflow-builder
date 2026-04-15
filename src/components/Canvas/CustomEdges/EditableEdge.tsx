'use client';

import { useCallback, useState, useRef } from 'react';
import {
  BaseEdge,
  EdgeProps,
  useReactFlow,
  Edge,
} from '@xyflow/react';
import { WorkflowEdgeData } from '@/types/workflow';
import { useWorkflowStore } from '@/store/workflowStore';

type EditableEdgeType = Edge<WorkflowEdgeData>;

export function EditableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  style = {},
  markerEnd,
  data,
  selected,
}: EdgeProps<EditableEdgeType>) {
  const { setEdges, getZoom } = useReactFlow();

  const highlightedEdgeId = useWorkflowStore((state) => state.highlightedEdgeId);
  const isHighlighted = highlightedEdgeId === id;

  // Get offset from edge data or default to center
  const offsetX = data?.offsetX ?? 0;
  const offsetY = data?.offsetY ?? 0;

  // Calculate the control point for the bezier curve
  const controlX = (sourceX + targetX) / 2 + offsetX;
  const controlY = (sourceY + targetY) / 2 + offsetY;

  // Calculate the actual midpoint of the quadratic bezier curve at t=0.5
  // Formula: B(0.5) = 0.25·P0 + 0.5·P1 + 0.25·P2
  // This is where the curve actually passes through, not the control point
  const curveMidX = 0.25 * sourceX + 0.5 * controlX + 0.25 * targetX;
  const curveMidY = 0.25 * sourceY + 0.5 * controlY + 0.25 * targetY;

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 });

  // Custom bezier path using the control point
  const customPath = `M ${sourceX} ${sourceY} Q ${controlX} ${controlY} ${targetX} ${targetY}`;

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      offsetX: offsetX,
      offsetY: offsetY,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      // Account for zoom level when converting screen pixels to flow coordinates
      const zoom = getZoom();
      const deltaX = (moveEvent.clientX - dragStartRef.current.x) / zoom;
      const deltaY = (moveEvent.clientY - dragStartRef.current.y) / zoom;

      // Multiply by 2 because the curve midpoint moves at half the rate of the control point
      // (bezier math: midpoint = 0.25*source + 0.5*control + 0.25*target)
      // So to move the curve midpoint by delta, we need to move the control point by 2*delta
      setEdges((edges) =>
        edges.map((edge) => {
          if (edge.id === id) {
            return {
              ...edge,
              data: {
                ...edge.data,
                offsetX: dragStartRef.current.offsetX + deltaX * 2,
                offsetY: dragStartRef.current.offsetY + deltaY * 2,
              },
            };
          }
          return edge;
        })
      );
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [id, offsetX, offsetY, setEdges, getZoom]);

  // Use graph-based loop detection passed via data.isLoop
  // (computed in WorkflowCanvas using DFS cycle detection)
  const isLoop = data?.isLoop ?? false;

  return (
    <>
      <g>
        <BaseEdge
          path={customPath}
          markerEnd={markerEnd}
          style={{
            ...style,
            strokeWidth: selected ? 3 : 2,
            stroke: isHighlighted ? '#ef4444' : (isLoop ? '#f59e0b' : (style.stroke || '#64748b')),
            transition: isHighlighted ? 'none' : 'stroke 0.2s ease-out',
          }}
        />
        {/* Invisible wider path for easier selection */}
        <path
          d={customPath}
          fill="none"
          strokeWidth={20}
          stroke="transparent"
          className="cursor-pointer"
        />
      </g>
      {/* Draggable midpoint handle - positioned at actual curve midpoint */}
      <g
        transform={`translate(${curveMidX}, ${curveMidY})`}
        onMouseDown={handleMouseDown}
        className="cursor-move"
        style={{ pointerEvents: 'all' }}
      >
        <circle
          r={isDragging ? 8 : 6}
          fill={isLoop ? '#f59e0b' : '#64748b'}
          stroke="white"
          strokeWidth={2}
          className={`transition-all ${isDragging ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}
        />
        {isLoop && (
          <text
            y={-12}
            textAnchor="middle"
            className="text-xs fill-amber-600 font-medium pointer-events-none select-none"
          >
            ↻ {data?.maxIterations || 3}x
          </text>
        )}
      </g>
    </>
  );
}
