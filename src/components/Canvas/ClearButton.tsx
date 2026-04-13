'use client';

import { Trash2 } from 'lucide-react';
import { useWorkflowStore } from '@/store/workflowStore';

interface ClearButtonProps {
  onClick: () => void;
}

export function ClearButton({ onClick }: ClearButtonProps) {
  const { nodes, edges } = useWorkflowStore();

  // Canvas is empty if only Start/End nodes exist and no edges
  const hasContentNodes = nodes.some(
    (node) => node.type !== 'start' && node.type !== 'end'
  );
  const hasEdges = edges.length > 0;
  const isEmpty = !hasContentNodes && !hasEdges;

  return (
    <button
      onClick={onClick}
      disabled={isEmpty}
      className={`
        flex items-center gap-2 px-3 py-2 text-sm font-medium rounded shadow-md
        ${
          isEmpty
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-red-500 text-white hover:bg-red-600'
        }
      `}
      title={isEmpty ? 'Canvas is already empty' : 'Clear all nodes and edges'}
    >
      <Trash2 className="w-4 h-4" />
      Clear
    </button>
  );
}
