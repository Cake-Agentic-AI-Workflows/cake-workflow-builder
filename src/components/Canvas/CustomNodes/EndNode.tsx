'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { Square } from 'lucide-react';
import { StartEndNodeData } from '@/types/workflow';

type EndNodeType = Node<StartEndNodeData, 'end'>;

function EndNodeComponent({ data }: NodeProps<EndNodeType>) {
  return (
    <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-100 border-2 border-red-500 shadow-md">
      <Square className="w-5 h-5 text-red-700" />
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-red-500"
      />
    </div>
  );
}

export const EndNode = memo(EndNodeComponent);
