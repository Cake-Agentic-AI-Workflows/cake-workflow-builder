'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { Play } from 'lucide-react';
import { StartEndNodeData } from '@/types/workflow';

type StartNodeType = Node<StartEndNodeData, 'start'>;

function StartNodeComponent({ data }: NodeProps<StartNodeType>) {
  return (
    <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-100 border-2 border-green-500 shadow-md">
      <Play className="w-6 h-6 text-green-700" />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-green-500"
      />
    </div>
  );
}

export const StartNode = memo(StartNodeComponent);
