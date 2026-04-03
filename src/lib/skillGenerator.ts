// SKILL.md generator - converts visual workflow to markdown

import { Edge } from '@xyflow/react';
import { WorkflowNode } from '@/store/workflowStore';
import {
  WorkflowMetadata,
  PhaseNodeData,
  ApprovalNodeData,
} from '@/types/workflow';

interface GeneratorInput {
  nodes: WorkflowNode[];
  edges: Edge[];
  metadata: WorkflowMetadata;
}

/**
 * Topologically sort nodes based on edges
 * Returns nodes in execution order
 */
function topologicalSort(nodes: WorkflowNode[], edges: Edge[]): WorkflowNode[] {
  const adjacency = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  // Initialize
  nodes.forEach((node) => {
    adjacency.set(node.id, []);
    inDegree.set(node.id, 0);
  });

  // Build graph
  edges.forEach((edge) => {
    adjacency.get(edge.source)?.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  });

  // Kahn's algorithm
  const queue: string[] = [];
  inDegree.forEach((degree, nodeId) => {
    if (degree === 0) queue.push(nodeId);
  });

  const sorted: WorkflowNode[] = [];
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    const node = nodeMap.get(nodeId);
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
 */
function generatePhaseSection(data: PhaseNodeData, phaseNum: number): string {
  const lines: string[] = [];

  lines.push(`### Phase ${phaseNum}: ${data.label}`);
  lines.push('');

  if (data.description) {
    lines.push(data.description);
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
 * Main generator function
 * Converts workflow to SKILL.md string
 */
export function generateSkillMd(input: GeneratorInput): string {
  const { nodes, edges, metadata } = input;

  // Sort nodes topologically
  const sortedNodes = topologicalSort(nodes, edges);

  // Filter out start/end nodes for content generation
  const contentNodes = sortedNodes.filter(
    (n) => n.type !== 'start' && n.type !== 'end'
  );

  // Count phases for numbering
  let phaseNum = 0;

  // Generate sections
  const sections = contentNodes.map((node) => {
    if (node.type === 'phase') {
      phaseNum++;
      return generatePhaseSection(node.data as PhaseNodeData, phaseNum);
    } else if (node.type === 'approval') {
      return generateApprovalSection(node.data as ApprovalNodeData);
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
