'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { Cog, Bot, Search, Lightbulb } from 'lucide-react';
import { PhaseNodeData, AgentType } from '@/types/workflow';
import { cn } from '@/lib/utils';

const agentIcons: Record<AgentType, React.ReactNode> = {
  'Explore': <Search className="w-4 h-4" />,
  'Plan': <Lightbulb className="w-4 h-4" />,
  'general-purpose': <Bot className="w-4 h-4" />,
  'none': <Cog className="w-4 h-4" />,
};

const agentColors: Record<AgentType, string> = {
  'Explore': 'border-blue-400 bg-blue-50',
  'Plan': 'border-purple-400 bg-purple-50',
  'general-purpose': 'border-orange-400 bg-orange-50',
  'none': 'border-gray-400 bg-gray-50',
};

type PhaseNodeType = Node<PhaseNodeData, 'phase'>;

function PhaseNodeComponent({ data, selected }: NodeProps<PhaseNodeType>) {
  return (
    <div
      className={cn(
        'w-56 rounded-lg border-2 shadow-md transition-all',
        agentColors[data.agent.type],
        selected && 'ring-2 ring-primary ring-offset-2'
      )}
    >
      {/* Top handle - input */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="w-3 h-3 !bg-gray-500 hover:!bg-primary hover:scale-150 transition-transform"
      />
      {/* Bottom handle - output */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="w-3 h-3 !bg-gray-500 hover:!bg-primary hover:scale-150 transition-transform"
      />
      {/* Left handle - bidirectional (stacked source + target at same position) */}
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="w-3 h-3 !bg-gray-500 hover:!bg-primary hover:scale-150 transition-transform"
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        className="w-3 h-3 !bg-gray-500 hover:!bg-primary hover:scale-150 transition-transform"
      />
      {/* Right handle - bidirectional (stacked source + target at same position) */}
      <Handle
        type="target"
        position={Position.Right}
        id="right"
        className="w-3 h-3 !bg-gray-500 hover:!bg-primary hover:scale-150 transition-transform"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="w-3 h-3 !bg-gray-500 hover:!bg-primary hover:scale-150 transition-transform"
      />

      <div className="p-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="p-1 rounded bg-white/60">
            {agentIcons[data.agent.type]}
          </span>
          <span className="font-medium text-sm truncate flex-1">
            {data.label}
          </span>
        </div>

        {data.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {data.description}
          </p>
        )}

        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="px-1.5 py-0.5 bg-white/60 rounded">
            {data.agent.type === 'none' ? 'No agent' : data.agent.type}
          </span>
          {data.agent.type !== 'none' && (
            <span className="px-1.5 py-0.5 bg-white/60 rounded">
              {data.agent.model}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export const PhaseNode = memo(PhaseNodeComponent);
