'use client';

import { useWorkflowStore, WorkflowEdge, WorkflowNode } from '@/store/workflowStore';
import { WorkflowEdgeData } from '@/types/workflow';
import { Trash2, RotateCcw, ArrowRight } from 'lucide-react';

interface EdgeConfigProps {
  edgeId: string;
  edge: WorkflowEdge;
}

/**
 * Determines if an edge is a "loop" (goes backward in the flow)
 * by comparing the Y positions of source and target nodes
 */
function isLoopEdge(edge: WorkflowEdge, nodes: WorkflowNode[]): boolean {
  const sourceNode = nodes.find((n) => n.id === edge.source);
  const targetNode = nodes.find((n) => n.id === edge.target);

  if (!sourceNode || !targetNode) return false;

  // If target is above source (lower Y = higher on screen), it's a loop back
  return targetNode.position.y < sourceNode.position.y;
}

export function EdgeConfig({ edgeId, edge }: EdgeConfigProps) {
  const { updateEdgeData, edges, nodes } = useWorkflowStore();

  const data = edge.data || {};
  const isLoop = isLoopEdge(edge, nodes);

  const updateData = (updates: Partial<WorkflowEdgeData>) => {
    updateEdgeData(edgeId, updates);
  };

  const deleteEdge = () => {
    useWorkflowStore.setState({
      edges: edges.filter((e) => e.id !== edgeId),
      selectedEdgeId: null,
    });
  };

  const sourceNode = nodes.find((n) => n.id === edge.source);
  const targetNode = nodes.find((n) => n.id === edge.target);

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Edge Configuration</h3>
        <button
          onClick={deleteEdge}
          className="p-2 text-destructive hover:bg-destructive/10 rounded"
          title="Delete edge"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Connection info */}
      <section className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">From:</span>
          <span className="font-medium">{sourceNode?.data?.label || edge.source}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">To:</span>
          <span className="font-medium">{targetNode?.data?.label || edge.target}</span>
        </div>
      </section>

      {/* Loop indicator */}
      {isLoop ? (
        <section className="space-y-3">
          <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-md">
            <RotateCcw className="w-4 h-4 text-orange-600" />
            <div>
              <p className="text-sm font-medium text-orange-800">Loop Detected</p>
              <p className="text-xs text-orange-600">This edge goes back to an earlier node</p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Max Iterations</label>
            <input
              type="number"
              value={data.maxIterations || 3}
              onChange={(e) =>
                updateData({ maxIterations: parseInt(e.target.value) || 3 })
              }
              min={1}
              max={100}
              className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Maximum times to repeat this loop
            </p>
          </div>

          <div>
            <label className="text-sm font-medium">Loop Condition (optional)</label>
            <textarea
              value={data.condition || ''}
              onChange={(e) => updateData({ condition: e.target.value })}
              rows={2}
              className="w-full mt-1 px-3 py-2 border rounded-md text-sm resize-none"
              placeholder="e.g., until all tests pass"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Describe when to continue looping
            </p>
          </div>
        </section>
      ) : (
        <section className="flex items-center gap-2 p-3 bg-muted/50 border rounded-md">
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Forward Flow</p>
            <p className="text-xs text-muted-foreground">Standard progression to next step</p>
          </div>
        </section>
      )}
    </div>
  );
}
