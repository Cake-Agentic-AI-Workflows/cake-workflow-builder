// src/test/fixtures/workflowBuilder.ts
import { WorkflowNode, WorkflowEdge } from '@/store/workflowStore';
import {
  WorkflowMetadata,
  PhaseNodeData,
  ApprovalNodeData,
  DecisionNodeData,
  defaultWorkflowMetadata,
  defaultPhaseNodeData,
  defaultApprovalNodeData,
  defaultDecisionNodeData,
  defaultEdgeData,
} from '@/types/workflow';

// Types for building workflows
export interface GeneratorInput {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  metadata: WorkflowMetadata;
}

export interface NodeSpec {
  type: 'phase' | 'approval' | 'decision';
  label: string;
  data?: Partial<PhaseNodeData | ApprovalNodeData | DecisionNodeData>;
}

export interface EdgeSpec {
  from: string; // label or 'start'
  to: string; // label or 'end'
  loop?: { maxIterations: number; condition?: string };
  branch?: string; // branch ID for decision nodes
}

export interface WorkflowSpec {
  nodes: NodeSpec[];
  edges?: EdgeSpec[];
  metadata?: Partial<WorkflowMetadata>;
}

// Build a workflow from a spec
export function buildWorkflow(spec: WorkflowSpec): GeneratorInput {
  const nodes: WorkflowNode[] = [];
  const edges: WorkflowEdge[] = [];
  const labelToId = new Map<string, string>();

  // Add start node
  nodes.push({
    id: 'start',
    type: 'start',
    position: { x: 250, y: 50 },
    data: { id: 'start', label: 'Start' },
    deletable: false,
  });
  labelToId.set('start', 'start');

  // Add content nodes
  let yPos = 150;
  spec.nodes.forEach((nodeSpec, index) => {
    const id = `node-${index + 1}`;
    labelToId.set(nodeSpec.label.toLowerCase(), id);

    if (nodeSpec.type === 'phase') {
      const baseData = defaultPhaseNodeData(id);
      nodes.push({
        id,
        type: 'phase',
        position: { x: 250, y: yPos },
        data: { ...baseData, label: nodeSpec.label, ...nodeSpec.data } as PhaseNodeData,
      });
    } else if (nodeSpec.type === 'approval') {
      const baseData = defaultApprovalNodeData(id);
      nodes.push({
        id,
        type: 'approval',
        position: { x: 250, y: yPos },
        data: { ...baseData, label: nodeSpec.label, ...nodeSpec.data } as ApprovalNodeData,
      });
    } else if (nodeSpec.type === 'decision') {
      const baseData = defaultDecisionNodeData(id);
      nodes.push({
        id,
        type: 'decision',
        position: { x: 250, y: yPos },
        data: { ...baseData, label: nodeSpec.label, ...nodeSpec.data } as DecisionNodeData,
      });
    }
    yPos += 150;
  });

  // Add end node
  nodes.push({
    id: 'end',
    type: 'end',
    position: { x: 250, y: yPos },
    data: { id: 'end', label: 'End' },
    deletable: false,
  });
  labelToId.set('end', 'end');

  // Create edges from spec or default linear
  if (spec.edges) {
    spec.edges.forEach((edgeSpec, index) => {
      const sourceId = labelToId.get(edgeSpec.from.toLowerCase()) || edgeSpec.from;
      const targetId = labelToId.get(edgeSpec.to.toLowerCase()) || edgeSpec.to;

      edges.push({
        id: `edge-${index}`,
        source: sourceId,
        target: targetId,
        sourceHandle: edgeSpec.branch || 'bottom',
        targetHandle: 'top',
        data: {
          ...defaultEdgeData,
          ...(edgeSpec.loop && {
            maxIterations: edgeSpec.loop.maxIterations,
            condition: edgeSpec.loop.condition,
          }),
        },
        animated: true,
        style: { strokeWidth: 2 },
      });
    });
  } else {
    // Default: linear chain start → node1 → node2 → ... → end
    const allIds = ['start', ...spec.nodes.map((_, i) => `node-${i + 1}`), 'end'];
    allIds.forEach((id, index) => {
      if (index < allIds.length - 1) {
        edges.push({
          id: `edge-${index}`,
          source: id,
          target: allIds[index + 1],
          sourceHandle: 'bottom',
          targetHandle: 'top',
          data: { ...defaultEdgeData },
          animated: true,
          style: { strokeWidth: 2 },
        });
      }
    });
  }

  return {
    nodes,
    edges,
    metadata: { ...defaultWorkflowMetadata, ...spec.metadata },
  };
}

// Build a simple linear workflow
export function linearWorkflow(
  nodeTypes: Array<{ type: 'phase' | 'approval'; label: string }>
): GeneratorInput {
  return buildWorkflow({
    nodes: nodeTypes.map((n) => ({ type: n.type, label: n.label })),
  });
}

// Add a loop edge to an existing workflow
export function withLoop(
  workflow: GeneratorInput,
  fromLabel: string,
  toLabel: string,
  maxIterations: number,
  condition?: string
): GeneratorInput {
  const fromNode = workflow.nodes.find(
    (n) => n.data.label.toLowerCase() === fromLabel.toLowerCase()
  );
  const toNode = workflow.nodes.find(
    (n) => n.data.label.toLowerCase() === toLabel.toLowerCase()
  );

  if (!fromNode || !toNode) {
    throw new Error(`Could not find nodes: ${fromLabel} or ${toLabel}`);
  }

  const loopEdge: WorkflowEdge = {
    id: `edge-loop-${fromNode.id}-${toNode.id}`,
    source: fromNode.id,
    target: toNode.id,
    sourceHandle: 'top',
    targetHandle: 'bottom',
    data: { maxIterations, condition },
    animated: true,
    style: { strokeWidth: 2 },
  };

  return {
    ...workflow,
    edges: [...workflow.edges, loopEdge],
  };
}

// Equivalence checking for round-trip tests
export interface EquivalenceResult {
  equal: boolean;
  differences: string[];
}

export function workflowsEquivalent(
  a: GeneratorInput,
  b: GeneratorInput
): EquivalenceResult {
  const differences: string[] = [];

  // Compare node counts by type
  const aTypes = countByType(a.nodes);
  const bTypes = countByType(b.nodes);
  for (const type of ['phase', 'approval', 'decision', 'start', 'end']) {
    if (aTypes[type] !== bTypes[type]) {
      differences.push(`Node count mismatch for ${type}: ${aTypes[type]} vs ${bTypes[type]}`);
    }
  }

  // Compare node labels exist in both
  const aLabels = new Set(a.nodes.map((n) => n.data.label.toLowerCase()));
  const bLabels = new Set(b.nodes.map((n) => n.data.label.toLowerCase()));
  for (const label of aLabels) {
    if (!bLabels.has(label)) {
      differences.push(`Label "${label}" missing in second workflow`);
    }
  }
  for (const label of bLabels) {
    if (!aLabels.has(label)) {
      differences.push(`Label "${label}" missing in first workflow`);
    }
  }

  // Compare edge connections (by label, not ID)
  const aEdges = edgesByLabel(a);
  const bEdges = edgesByLabel(b);
  for (const key of aEdges.keys()) {
    if (!bEdges.has(key)) {
      differences.push(`Edge ${key} missing in second workflow`);
    }
  }
  for (const key of bEdges.keys()) {
    if (!aEdges.has(key)) {
      differences.push(`Edge ${key} missing in first workflow`);
    }
  }

  // Compare metadata
  if (a.metadata.name !== b.metadata.name) {
    differences.push(`Metadata name mismatch: ${a.metadata.name} vs ${b.metadata.name}`);
  }
  if (a.metadata.description !== b.metadata.description) {
    differences.push(`Metadata description mismatch`);
  }

  return { equal: differences.length === 0, differences };
}

function countByType(nodes: WorkflowNode[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const node of nodes) {
    counts[node.type] = (counts[node.type] || 0) + 1;
  }
  return counts;
}

function edgesByLabel(workflow: GeneratorInput): Map<string, WorkflowEdge> {
  const nodeIdToLabel = new Map<string, string>();
  workflow.nodes.forEach((n) => nodeIdToLabel.set(n.id, n.data.label.toLowerCase()));

  const result = new Map<string, WorkflowEdge>();
  workflow.edges.forEach((e) => {
    const sourceLabel = nodeIdToLabel.get(e.source) || e.source;
    const targetLabel = nodeIdToLabel.get(e.target) || e.target;
    result.set(`${sourceLabel}->${targetLabel}`, e);
  });
  return result;
}

// Assertion helpers
export function assertContainsPhase(md: string, num: number, label: string): void {
  const pattern = new RegExp(`### Phase ${num}: ${label}`, 'i');
  if (!pattern.test(md)) {
    throw new Error(`Expected "### Phase ${num}: ${label}" in output:\n${md.slice(0, 500)}`);
  }
}

export function assertContainsLoopControl(
  md: string,
  targetLabel: string,
  maxIterations: number
): void {
  if (!md.includes('**Loop Control:**')) {
    throw new Error(`Expected "**Loop Control:**" section in output:\n${md.slice(0, 500)}`);
  }
  if (!md.includes(targetLabel)) {
    throw new Error(`Expected loop target "${targetLabel}" in output`);
  }
  if (!md.includes(`${maxIterations} times`)) {
    throw new Error(`Expected "${maxIterations} times" in loop control`);
  }
}

export function assertContainsDecision(
  md: string,
  label: string,
  branches: string[]
): void {
  if (!md.includes(`### Decision: ${label}`)) {
    throw new Error(`Expected "### Decision: ${label}" in output`);
  }
  for (const branch of branches) {
    if (!md.includes(`**${branch}**`)) {
      throw new Error(`Expected branch "**${branch}**" in decision output`);
    }
  }
}

export function assertContainsApproval(
  md: string,
  label: string,
  question: string
): void {
  if (!md.includes(`### ${label}`)) {
    throw new Error(`Expected "### ${label}" in output`);
  }
  if (!md.includes('AskUserQuestion')) {
    throw new Error(`Expected "AskUserQuestion" in approval output`);
  }
  if (!md.includes(question)) {
    throw new Error(`Expected question "${question}" in approval output`);
  }
}
