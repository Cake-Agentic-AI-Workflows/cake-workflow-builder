'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { HelpCircle } from 'lucide-react';
import { ApprovalNodeData } from '@/types/workflow';
import { cn } from '@/lib/utils';

type ApprovalNodeType = Node<ApprovalNodeData, 'approval'>;

function ApprovalNodeComponent({ data, selected }: NodeProps<ApprovalNodeType>) {
  return (
    <div
      className={cn(
        'w-56 rounded-lg border-2 border-yellow-400 bg-yellow-50 shadow-md transition-all',
        selected && 'ring-2 ring-primary ring-offset-2'
      )}
    >
      {/* Top handle - input */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="w-4 h-4 !bg-yellow-500 hover:!bg-primary hover:scale-150 transition-transform"
      />
      {/* Bottom handle - output */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="w-4 h-4 !bg-yellow-500 hover:!bg-primary hover:scale-150 transition-transform"
      />
      {/* Left handle - bidirectional (stacked source + target at same position) */}
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="w-4 h-4 !bg-yellow-500 hover:!bg-primary hover:scale-150 transition-transform"
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        className="w-4 h-4 !bg-yellow-500 hover:!bg-primary hover:scale-150 transition-transform"
      />
      {/* Right handle - bidirectional (stacked source + target at same position) */}
      <Handle
        type="target"
        position={Position.Right}
        id="right"
        className="w-4 h-4 !bg-yellow-500 hover:!bg-primary hover:scale-150 transition-transform"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="w-4 h-4 !bg-yellow-500 hover:!bg-primary hover:scale-150 transition-transform"
      />

      <div className="p-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="p-1 rounded bg-white/60">
            <HelpCircle className="w-4 h-4 text-yellow-700" />
          </span>
          <span className="font-medium text-sm truncate flex-1">
            {data.label}
          </span>
        </div>

        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
          {data.question}
        </p>

        <div className="flex flex-wrap gap-1">
          {data.options.map((opt, i) => (
            <span
              key={i}
              className="px-1.5 py-0.5 bg-white/60 rounded text-xs"
            >
              {opt.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export const ApprovalNode = memo(ApprovalNodeComponent);
