'use client';

import { useWorkflowStore } from '@/store/workflowStore';
import { PhaseNodeData, ApprovalNodeData, DecisionNodeData } from '@/types/workflow';
import { PhaseConfig } from './PhaseConfig';
import { ApprovalConfig } from './ApprovalConfig';
import { DecisionConfig } from './DecisionConfig';
import { EdgeConfig } from './EdgeConfig';

export function ConfigPanel() {
  const { nodes, edges, selectedNodeId, selectedEdgeId } = useWorkflowStore();

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const selectedEdge = edges.find((e) => e.id === selectedEdgeId);

  // Edge selected
  if (selectedEdge) {
    return (
      <div className="w-80 border-l bg-card overflow-y-auto">
        <EdgeConfig edgeId={selectedEdge.id} edge={selectedEdge} />
      </div>
    );
  }

  if (!selectedNode) {
    return (
      <div className="w-80 p-4 border-l bg-card">
        <div className="h-full flex items-center justify-center text-muted-foreground text-sm text-center">
          <p>Select a node or edge to configure it</p>
        </div>
      </div>
    );
  }

  if (selectedNode.type === 'start' || selectedNode.type === 'end') {
    return (
      <div className="w-80 p-4 border-l bg-card">
        <div className="h-full flex items-center justify-center text-muted-foreground text-sm text-center">
          <p>Start and End nodes cannot be configured</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 border-l bg-card overflow-y-auto">
      {selectedNode.type === 'phase' && (
        <PhaseConfig
          nodeId={selectedNode.id}
          data={selectedNode.data as PhaseNodeData}
        />
      )}
      {selectedNode.type === 'approval' && (
        <ApprovalConfig
          nodeId={selectedNode.id}
          data={selectedNode.data as ApprovalNodeData}
        />
      )}
      {selectedNode.type === 'decision' && (
        <DecisionConfig
          nodeId={selectedNode.id}
          data={selectedNode.data as DecisionNodeData}
        />
      )}
    </div>
  );
}
