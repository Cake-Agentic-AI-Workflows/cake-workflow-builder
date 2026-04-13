// SKILL.md generator - converts visual workflow to markdown

import { WorkflowNode, WorkflowEdge } from '@/store/workflowStore';
import {
  WorkflowMetadata,
  PhaseNodeData,
  ApprovalNodeData,
  DecisionNodeData,
} from '@/types/workflow';
import { findLoopEdges } from './graphUtils';

interface GeneratorInput {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  metadata: WorkflowMetadata;
}

/**
 * Topologically sort nodes based on edges
 * Returns nodes in execution order (ignores loop-back edges to avoid cycles)
 */
function topologicalSort(nodes: WorkflowNode[], edges: WorkflowEdge[], loopEdgeIds: Set<string>): WorkflowNode[] {
  const adjacency = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  // Initialize
  nodes.forEach((node) => {
    adjacency.set(node.id, []);
    inDegree.set(node.id, 0);
  });

  // Build graph - skip loop edges to avoid cycles
  edges.forEach((edge) => {
    if (!loopEdgeIds.has(edge.id)) {
      adjacency.get(edge.source)?.push(edge.target);
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    }
  });

  // Kahn's algorithm
  const queue: string[] = [];
  inDegree.forEach((degree, nodeId) => {
    if (degree === 0) queue.push(nodeId);
  });

  const sorted: WorkflowNode[] = [];

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    const node = nodes.find((n) => n.id === nodeId);
    if (node) sorted.push(node);

    adjacency.get(nodeId)?.forEach((targetId) => {
      const newDegree = (inDegree.get(targetId) || 0) - 1;
      inDegree.set(targetId, newDegree);
      if (newDegree === 0) queue.push(targetId);
    });
  }

  return sorted;
}

/**
 * Generate YAML frontmatter
 */
function generateFrontmatter(metadata: WorkflowMetadata): string {
  const tagsYaml = metadata.tags.map((t) => `    - ${t}`).join('\n');

  return `---
name: ${metadata.name}
description: >
  ${metadata.description}
metadata:
  tags:
${tagsYaml}
  author: ${metadata.author}
  version: "${metadata.version}"
  user-invocable: ${metadata.userInvocable}
---`;
}

/**
 * Generate a phase section from node data
 * Includes any loop-back edge info
 */
function generatePhaseSection(
  data: PhaseNodeData,
  phaseNum: number,
  loopBackEdge?: WorkflowEdge,
  nodeMap?: Map<string, WorkflowNode>
): string {
  const lines: string[] = [];

  lines.push(`### Phase ${phaseNum}: ${data.label}`);
  lines.push('');

  if (data.description) {
    lines.push(data.description);
    lines.push('');
  }

  // Loop-back instruction
  if (loopBackEdge) {
    const targetNode = nodeMap?.get(loopBackEdge.target);
    const targetLabel = targetNode?.data?.label || loopBackEdge.target;
    const maxIterations = loopBackEdge.data?.maxIterations || 3;
    const condition = loopBackEdge.data?.condition;

    lines.push('**Loop Control:**');
    if (condition) {
      lines.push(`- Repeat back to "${targetLabel}" ${condition}, up to ${maxIterations} times`);
    } else {
      lines.push(`- May repeat back to "${targetLabel}", up to ${maxIterations} times maximum`);
    }
    lines.push('');
  }

  // Agent configuration
  if (data.agent.type !== 'none') {
    let agentLine = `Use Agent tool with \`subagent_type: "${data.agent.type}"\``;
    if (data.agent.model) {
      agentLine += ` and \`model: "${data.agent.model}"\``;
    }
    agentLine += ':';
    lines.push(agentLine);
    lines.push('');

    if (data.agent.prompt) {
      lines.push('```');
      lines.push(data.agent.prompt);
      lines.push('```');
      lines.push('');
    }
  } else if (data.agent.prompt) {
    lines.push(data.agent.prompt);
    lines.push('');
  }

  // Subagent configuration
  if (data.subagent.enabled) {
    lines.push('**Subagent Control:**');
    if (data.subagent.condition) {
      lines.push(`- Spawn when: ${data.subagent.condition}`);
    }
    lines.push(`- Execution: ${data.subagent.execution}`);
    if (data.subagent.maxIterations > 0) {
      lines.push(`- Maximum iterations: ${data.subagent.maxIterations}`);
    }
    if (data.subagent.timeout > 0) {
      lines.push(`- Timeout: ${data.subagent.timeout} seconds`);
    }
    lines.push('');
  }

  // Context
  if (data.context.inputs.length > 0) {
    lines.push(`**Inputs:** ${data.context.inputs.join(', ')}`);
  }
  if (data.context.outputs.length > 0) {
    lines.push(`**Output:** ${data.context.outputs.join(', ')}`);
  }
  if (data.context.sizeLimit) {
    lines.push(`**Context limit:** ${data.context.sizeLimit} tokens`);
  }

  return lines.join('\n');
}

/**
 * Generate an approval gate section
 */
function generateApprovalSection(data: ApprovalNodeData): string {
  const lines: string[] = [];

  lines.push(`### ${data.label}`);
  lines.push('');
  lines.push('Use `AskUserQuestion` to confirm:');
  lines.push('');
  lines.push('```');
  lines.push(`Question: "${data.question}"`);
  lines.push('Options:');
  data.options.forEach((opt) => {
    lines.push(`- ${opt.label}: ${opt.description}`);
  });
  lines.push('```');
  lines.push('');
  lines.push('**Do NOT proceed without user confirmation.**');

  return lines.join('\n');
}

/**
 * Generate a decision block section
 */
function generateDecisionSection(
  data: DecisionNodeData,
  outgoingEdges: WorkflowEdge[],
  nodeMap: Map<string, WorkflowNode>
): string {
  const lines: string[] = [];

  lines.push(`### Decision: ${data.label}`);
  lines.push('');
  lines.push(`**${data.question}**`);
  lines.push('');
  lines.push('Based on the outcome, take one of the following paths:');
  lines.push('');

  data.branches.forEach((branch) => {
    // Find the edge for this branch
    const edge = outgoingEdges.find((e) => e.sourceHandle === branch.id);
    const targetNode = edge ? nodeMap.get(edge.target) : null;
    const targetLabel = targetNode?.data?.label || 'next step';

    lines.push(`- **${branch.label}**: ${branch.condition || 'Default path'}`);
    lines.push(`  - Go to: ${targetLabel}`);
  });

  return lines.join('\n');
}

/**
 * Main generator function
 * Converts workflow to SKILL.md string
 */
export function generateSkillMd(input: GeneratorInput): string {
  const { nodes, edges, metadata } = input;

  // Create node map for lookups
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Find loop edges using graph-based cycle detection
  const loopEdgeIds = findLoopEdges(nodes, edges);

  // Sort nodes topologically (excluding loop edges)
  const sortedNodes = topologicalSort(nodes, edges, loopEdgeIds);

  // Filter out start/end nodes for content generation
  const contentNodes = sortedNodes.filter(
    (n) => n.type !== 'start' && n.type !== 'end'
  );

  // Build map of loop edges keyed by source node
  const loopEdges = new Map<string, WorkflowEdge>();
  edges.forEach((edge) => {
    if (loopEdgeIds.has(edge.id)) {
      loopEdges.set(edge.source, edge);
    }
  });

  // Count phases for numbering
  let phaseNum = 0;

  // Generate sections
  const sections = contentNodes.map((node) => {
    if (node.type === 'phase') {
      phaseNum++;
      const loopBack = loopEdges.get(node.id);
      return generatePhaseSection(node.data as PhaseNodeData, phaseNum, loopBack, nodeMap);
    } else if (node.type === 'approval') {
      return generateApprovalSection(node.data as ApprovalNodeData);
    } else if (node.type === 'decision') {
      const outgoingEdges = edges.filter((e) => e.source === node.id);
      return generateDecisionSection(node.data as DecisionNodeData, outgoingEdges, nodeMap);
    }
    return '';
  }).filter(Boolean);

  // Assemble the full SKILL.md
  const parts: string[] = [];

  // Frontmatter
  parts.push(generateFrontmatter(metadata));
  parts.push('');

  // Title and description
  parts.push(`# ${metadata.name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}`);
  parts.push('');
  parts.push(metadata.description);
  parts.push('');

  // When to use section
  parts.push('## When to Use');
  parts.push('');
  parts.push('**Explicit invocation required** - invoke with `/' + metadata.name + '`');
  parts.push('');

  // Workflow overview
  parts.push('## Workflow Overview');
  parts.push('');
  parts.push(`**${phaseNum}-phase process**`);
  parts.push('');

  // Add all sections with separators
  parts.push(sections.join('\n\n---\n\n'));

  return parts.join('\n');
}

/**
 * Validate workflow before export
 * Returns array of warning messages
 */
export function validateWorkflow(input: GeneratorInput): string[] {
  const warnings: string[] = [];
  const { nodes, edges, metadata } = input;

  // Check metadata
  if (!metadata.name || metadata.name === 'my-workflow') {
    warnings.push('Workflow name not set - consider setting a meaningful name');
  }
  if (!metadata.description || metadata.description.includes('custom workflow created')) {
    warnings.push('Description uses default text - consider writing a specific description');
  }
  if (!metadata.author) {
    warnings.push('Author not set');
  }

  // Check for orphaned nodes (no connections)
  const connectedNodes = new Set<string>();
  edges.forEach((e) => {
    connectedNodes.add(e.source);
    connectedNodes.add(e.target);
  });

  nodes.forEach((node) => {
    if (node.type !== 'start' && node.type !== 'end') {
      if (!connectedNodes.has(node.id)) {
        warnings.push(`Node "${node.data.label}" is not connected to the workflow`);
      }
    }
  });

  // Check phase nodes
  nodes.forEach((node) => {
    if (node.type === 'phase') {
      const data = node.data as PhaseNodeData;
      if (!data.description && !data.agent.prompt) {
        warnings.push(`Phase "${data.label}" has no description or prompt`);
      }
      if (data.agent.type !== 'none' && !data.agent.prompt) {
        warnings.push(`Phase "${data.label}" uses an agent but has no prompt`);
      }
    }
    if (node.type === 'approval') {
      const data = node.data as ApprovalNodeData;
      if (!data.question) {
        warnings.push(`Approval gate "${data.label}" has no question`);
      }
      if (data.options.length < 2) {
        warnings.push(`Approval gate "${data.label}" should have at least 2 options`);
      }
    }
  });

  // Check connectivity from start to end
  const reachableFromStart = new Set<string>();
  const queue = ['start'];
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    if (reachableFromStart.has(nodeId)) continue;
    reachableFromStart.add(nodeId);
    edges
      .filter((e) => e.source === nodeId)
      .forEach((e) => queue.push(e.target));
  }

  if (!reachableFromStart.has('end')) {
    warnings.push('No path from Start to End - workflow may not execute fully');
  }

  return warnings;
}
