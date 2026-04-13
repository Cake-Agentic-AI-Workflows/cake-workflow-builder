'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { GitBranch } from 'lucide-react';
import { DecisionNodeData } from '@/types/workflow';
import { cn } from '@/lib/utils';

type DecisionNodeType = Node<DecisionNodeData, 'decision'>;

function DecisionNodeComponent({ data, selected }: NodeProps<DecisionNodeType>) {
  const branchCount = data.branches.length;

  return (
    <div
      className={cn(
        'relative w-48',
        selected && 'drop-shadow-lg'
      )}
    >
      {/* Input handles - receives connections */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="w-3 h-3 !bg-gray-500 hover:!bg-primary hover:scale-150 transition-transform"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="w-3 h-3 !bg-gray-500 hover:!bg-primary hover:scale-150 transition-transform"
      />
      <Handle
        type="target"
        position={Position.Right}
        id="right"
        className="w-3 h-3 !bg-gray-500 hover:!bg-primary hover:scale-150 transition-transform"
      />

      {/* Diamond shape using CSS transform */}
      <div
        className={cn(
          'w-32 h-32 mx-auto border-2 shadow-md transition-all',
          'bg-amber-50 border-amber-400',
          'transform rotate-45',
          selected && 'ring-2 ring-primary ring-offset-2'
        )}
      >
        {/* Content rotated back to be readable */}
        <div className="absolute inset-0 flex flex-col items-center justify-center transform -rotate-45 p-2">
          <div className="flex items-center gap-1 mb-1">
            <GitBranch className="w-4 h-4 text-amber-600" />
            <span className="font-medium text-sm truncate max-w-[80px]">
              {data.label}
            </span>
          </div>
          <p className="text-xs text-muted-foreground text-center line-clamp-2 max-w-[90px]">
            {data.question}
          </p>
        </div>
      </div>

      {/* Branch output handles - positioned around the bottom of the diamond */}
      {data.branches.map((branch, index) => {
        const positions = getHandlePositions(branchCount);
        const pos = positions[index];

        return (
          <Handle
            key={branch.id}
            type="source"
            position={Position.Bottom}
            id={branch.id}
            className="w-3 h-3 !bg-amber-500 hover:!bg-primary hover:scale-125 transition-transform"
            style={{
              left: `${pos}%`,
              bottom: '-6px',
            }}
          />
        );
      })}

      {/* Branch labels below the diamond */}
      <div className="flex justify-around mt-2 px-2">
        {data.branches.map((branch) => (
          <span
            key={branch.id}
            className="text-xs text-muted-foreground bg-white/80 px-1 rounded truncate max-w-[60px]"
            title={branch.label}
          >
            {branch.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function getHandlePositions(count: number): number[] {
  switch (count) {
    case 2:
      return [30, 70];
    case 3:
      return [20, 50, 80];
    case 4:
      return [15, 38, 62, 85];
    default:
      return [50];
  }
}

export const DecisionNode = memo(DecisionNodeComponent);
