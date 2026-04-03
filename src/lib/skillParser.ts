// SKILL.md parser - converts markdown back to workflow (best-effort)

import { Edge } from '@xyflow/react';
import { WorkflowNode, PhaseNode, ApprovalNode, StartNode, EndNode } from '@/store/workflowStore';
import {
  WorkflowMetadata,
  defaultWorkflowMetadata,
  defaultPhaseNodeData,
  defaultApprovalNodeData,
} from '@/types/workflow';

interface ParseResult {
  nodes: WorkflowNode[];
  edges: Edge[];
  metadata: WorkflowMetadata;
  warnings: string[];
}

/**
 * Parse YAML frontmatter from SKILL.md
 */
function parseFrontmatter(content: string): { metadata: Partial<WorkflowMetadata>; body: string } {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  if (!frontmatterMatch) {
    return { metadata: {}, body: content };
  }

  const [, frontmatter, body] = frontmatterMatch;
  const metadata: Partial<WorkflowMetadata> = {};

  // Parse name
  const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
  if (nameMatch) metadata.name = nameMatch[1].trim();

  // Parse description
  const descMatch = frontmatter.match(/description:\s*>?\n?\s*(.+?)(?=\n[a-z]|\nmetadata:)/s);
  if (descMatch) metadata.description = descMatch[1].trim();

  // Parse author
  const authorMatch = frontmatter.match(/author:\s*(.+)$/m);
  if (authorMatch) metadata.author = authorMatch[1].trim();

  // Parse version
  const versionMatch = frontmatter.match(/version:\s*"?([^"\n]+)"?/m);
  if (versionMatch) metadata.version = versionMatch[1].trim();

  // Parse tags
  const tagsMatch = frontmatter.match(/tags:\n((?:\s+-\s*.+\n?)+)/m);
  if (tagsMatch) {
    metadata.tags = tagsMatch[1]
      .split('\n')
      .map((line) => line.replace(/^\s*-\s*/, '').trim())
      .filter(Boolean);
  }

  // Parse user-invocable
  const userInvocableMatch = frontmatter.match(/user-invocable:\s*(true|false)/m);
  if (userInvocableMatch) metadata.userInvocable = userInvocableMatch[1] === 'true';

  return { metadata, body };
}

/**
 * Parse a phase section into node data
 */
function parsePhaseSection(sectionContent: string, id: string): PhaseNode['data'] {
  const data = defaultPhaseNodeData(id);

  // Extract label from header
  const headerMatch = sectionContent.match(/^###?\s*Phase\s*\d*:?\s*(.+)$/m);
  if (headerMatch) {
    data.label = headerMatch[1].trim();
  }

  // Extract agent type
  const agentMatch = sectionContent.match(/subagent_type:\s*"?([^"}\s]+)"?/);
  if (agentMatch) {
    const agentType = agentMatch[1] as 'Explore' | 'Plan' | 'general-purpose';
    if (['Explore', 'Plan', 'general-purpose'].includes(agentType)) {
      data.agent.type = agentType;
    }
  }

  // Extract model
  const modelMatch = sectionContent.match(/model:\s*"?([^"}\s]+)"?/);
  if (modelMatch) {
    const model = modelMatch[1] as 'opus' | 'sonnet' | 'haiku';
    if (['opus', 'sonnet', 'haiku'].includes(model)) {
      data.agent.model = model;
    }
  }

  // Extract prompt from code block
  const codeBlockMatch = sectionContent.match(/```\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    data.agent.prompt = codeBlockMatch[1].trim();
  }

  // Extract description (text before "Use Agent" or code block)
  const parts = sectionContent.split(/Use Agent tool|```/);
  if (parts[0]) {
    const descLines = parts[0]
      .split('\n')
      .filter((line) => !line.match(/^###?\s*Phase/))
      .join('\n')
      .trim();
    if (descLines) {
      data.description = descLines;
    }
  }

  // Extract subagent config
  if (sectionContent.includes('**Subagent Control:**')) {
    data.subagent.enabled = true;
    const execMatch = sectionContent.match(/Execution:\s*(parallel|sequential)/i);
    if (execMatch) data.subagent.execution = execMatch[1].toLowerCase() as 'parallel' | 'sequential';
    const iterMatch = sectionContent.match(/Maximum iterations:\s*(\d+)/i);
    if (iterMatch) data.subagent.maxIterations = parseInt(iterMatch[1]);
    const timeoutMatch = sectionContent.match(/Timeout:\s*(\d+)/i);
    if (timeoutMatch) data.subagent.timeout = parseInt(timeoutMatch[1]);
  }

  // Extract outputs
  const outputMatch = sectionContent.match(/\*\*Output:\*\*\s*(.+)$/m);
  if (outputMatch) {
    data.context.outputs = outputMatch[1].split(',').map((s) => s.trim());
  }

  // Extract inputs
  const inputMatch = sectionContent.match(/\*\*Inputs?:\*\*\s*(.+)$/m);
  if (inputMatch) {
    data.context.inputs = inputMatch[1].split(',').map((s) => s.trim());
  }

  return data;
}

/**
 * Parse an approval section into node data
 */
function parseApprovalSection(sectionContent: string, id: string): ApprovalNode['data'] {
  const data = defaultApprovalNodeData(id);

  // Extract label from header
  const headerMatch = sectionContent.match(/^###?\s*(.+)$/m);
  if (headerMatch) {
    data.label = headerMatch[1].trim();
  }

  // Extract question
  const questionMatch = sectionContent.match(/Question:\s*"(.+?)"/);
  if (questionMatch) {
    data.question = questionMatch[1];
  }

  // Extract options
  const optionsMatch = sectionContent.match(/Options:\n((?:-\s*.+\n?)+)/);
  if (optionsMatch) {
    data.options = optionsMatch[1]
      .split('\n')
      .filter((line) => line.trim().startsWith('-'))
      .map((line) => {
        const match = line.match(/-\s*([^:]+):\s*(.+)/);
        if (match) {
          return { label: match[1].trim(), description: match[2].trim() };
        }
        return { label: line.replace(/^-\s*/, '').trim(), description: '' };
      });
  }

  return data;
}

/**
 * Main parser function
 * Converts SKILL.md to workflow structure
 * NOTE: This parser works best with builder-generated files
 */
export function parseSkillMd(content: string): ParseResult {
  const warnings: string[] = [];

  // Parse frontmatter
  const { metadata: parsedMetadata, body } = parseFrontmatter(content);
  const metadata: WorkflowMetadata = {
    ...defaultWorkflowMetadata,
    ...parsedMetadata,
  };

  const nodes: WorkflowNode[] = [];
  const edges: Edge[] = [];

  // Add start node
  const startNode: StartNode = {
    id: 'start',
    type: 'start',
    position: { x: 250, y: 50 },
    data: { id: 'start', label: 'Start' },
    deletable: false,
  };
  nodes.push(startNode);

  // Split body by ### headers to find sections
  const sections = body.split(/(?=###\s+)/g).filter((s) => s.trim());

  let nodeCounter = 0;
  let yPosition = 150;
  let previousNodeId = 'start';

  for (const section of sections) {
    // Detect section type
    const isPhase = section.match(/^###?\s*Phase/i);
    const isApproval = section.includes('AskUserQuestion') || section.match(/^###?\s*.*Approval/i);

    if (isPhase && !isApproval) {
      const id = `node-${++nodeCounter}`;
      const phaseData = parsePhaseSection(section, id);

      const phaseNode: PhaseNode = {
        id,
        type: 'phase',
        position: { x: 250, y: yPosition },
        data: phaseData,
      };
      nodes.push(phaseNode);

      // Add edge from previous node
      edges.push({
        id: `edge-${previousNodeId}-${id}`,
        source: previousNodeId,
        target: id,
        animated: true,
        style: { strokeWidth: 2 },
      });

      previousNodeId = id;
      yPosition += 150;
    } else if (isApproval) {
      const id = `node-${++nodeCounter}`;
      const approvalData = parseApprovalSection(section, id);

      const approvalNode: ApprovalNode = {
        id,
        type: 'approval',
        position: { x: 250, y: yPosition },
        data: approvalData,
      };
      nodes.push(approvalNode);

      // Add edge from previous node
      edges.push({
        id: `edge-${previousNodeId}-${id}`,
        source: previousNodeId,
        target: id,
        animated: true,
        style: { strokeWidth: 2 },
      });

      previousNodeId = id;
      yPosition += 150;
    }
  }

  // Add end node
  const endNode: EndNode = {
    id: 'end',
    type: 'end',
    position: { x: 250, y: yPosition },
    data: { id: 'end', label: 'End' },
    deletable: false,
  };
  nodes.push(endNode);

  // Connect last node to end
  if (previousNodeId !== 'start') {
    edges.push({
      id: `edge-${previousNodeId}-end`,
      source: previousNodeId,
      target: 'end',
      animated: true,
      style: { strokeWidth: 2 },
    });
  }

  // Add warnings for incomplete parsing
  if (nodes.length <= 2) {
    warnings.push('No phases detected - the SKILL.md format may not be compatible');
  }

  return { nodes, edges, metadata, warnings };
}
