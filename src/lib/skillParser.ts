// SKILL.md parser - converts markdown back to workflow (best-effort)

import { WorkflowNode, WorkflowEdge, PhaseNode, ApprovalNode, StartNode, EndNode, DecisionNode } from '@/store/workflowStore';
import {
  WorkflowMetadata,
  defaultWorkflowMetadata,
  defaultPhaseNodeData,
  defaultApprovalNodeData,
  defaultDecisionNodeData,
  defaultEdgeData,
} from '@/types/workflow';

interface ParseResult {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  metadata: WorkflowMetadata;
  warnings: string[];
}

interface LoopInfo {
  sourceId: string;
  targetLabel: string;
  maxIterations: number;
  condition?: string;
}

interface DecisionInfo {
  nodeId: string;
  branches: { label: string; condition: string; targetLabel: string }[];
}

/**
 * Get the appropriate source handle ID for a node type
 * When connecting FROM a node, we use its bottom handle (for vertical flow)
 */
function getSourceHandle(nodeType: string): string {
  switch (nodeType) {
    case 'start':
      return 'bottom';
    case 'phase':
    case 'approval':
      return 'bottom';
    case 'decision':
      // Decision nodes use branch-specific handles, but for default we use bottom area
      return 'branch-1';
    default:
      return 'bottom';
  }
}

/**
 * Get the appropriate target handle ID for a node type
 * When connecting TO a node, we use its top handle (for vertical flow)
 */
function getTargetHandle(nodeType: string): string {
  switch (nodeType) {
    case 'end':
      return 'top';
    case 'phase':
    case 'approval':
      return 'top';
    case 'decision':
      return 'top';
    default:
      return 'top';
  }
}

/**
 * Parse YAML frontmatter from SKILL.md
 */
export function parseFrontmatter(content: string): { metadata: Partial<WorkflowMetadata>; body: string } {
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
 * Also extracts loop-back information if present
 */
function parsePhaseSection(sectionContent: string, id: string): { data: PhaseNode['data']; loopInfo?: LoopInfo } {
  const data = defaultPhaseNodeData(id);
  let loopInfo: LoopInfo | undefined;

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

  // Extract loop control (explicit format)
  if (sectionContent.includes('**Loop Control:**')) {
    const loopMatch = sectionContent.match(/[Rr]epeat\s*(?:back\s*)?to\s*"([^"]+)".*?(?:up\s*to\s*)?(\d+)\s*times/i);
    if (loopMatch) {
      loopInfo = {
        sourceId: id,
        targetLabel: loopMatch[1],
        maxIterations: parseInt(loopMatch[2]),
      };
      // Extract condition if present
      const condMatch = sectionContent.match(/[Rr]epeat.*?"[^"]+"\s*(.+?),\s*up\s*to/);
      if (condMatch) {
        loopInfo.condition = condMatch[1].trim();
      }
    }
  }

  // Natural language loop detection
  // Patterns: "repeat up to N times", "retry up to N times", "iterate up to N times"
  const nlLoopMatch = sectionContent.match(/(?:repeat|retry|iterate|loop)\s*(?:this\s*)?(?:phase|step)?\s*(?:up\s*to\s*)?(\d+)\s*times?/i);
  if (nlLoopMatch && !loopInfo) {
    // Self-loop (repeat current phase)
    loopInfo = {
      sourceId: id,
      targetLabel: data.label, // Loop back to self
      maxIterations: parseInt(nlLoopMatch[1]),
    };
  }

  // Natural language: "if X fails, go back to Phase Y"
  const goBackMatch = sectionContent.match(/(?:go\s*back|return|loop\s*back)\s*to\s*(?:Phase\s*\d*:?\s*)?["']?([^"'\n,]+)["']?(?:.*?up\s*to\s*(\d+)\s*times)?/i);
  if (goBackMatch && !loopInfo) {
    loopInfo = {
      sourceId: id,
      targetLabel: goBackMatch[1].trim(),
      maxIterations: goBackMatch[2] ? parseInt(goBackMatch[2]) : 3,
    };
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

  return { data, loopInfo };
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
 * Parse a decision section into node data
 */
function parseDecisionSection(sectionContent: string, id: string): { data: DecisionNode['data']; decisionInfo: DecisionInfo } {
  const data = defaultDecisionNodeData(id);

  // Extract label from header
  const headerMatch = sectionContent.match(/^###?\s*Decision:\s*(.+)$/m);
  if (headerMatch) {
    data.label = headerMatch[1].trim();
  }

  // Extract question (bold text)
  const questionMatch = sectionContent.match(/\*\*([^*]+)\*\*/);
  if (questionMatch) {
    data.question = questionMatch[1].trim();
  }

  // Parse branches
  const branchMatches = sectionContent.matchAll(/- \*\*([^*]+)\*\*:\s*(.+)\n\s*- Go to:\s*(.+)/g);
  const branches: { label: string; condition: string; targetLabel: string }[] = [];

  for (const match of branchMatches) {
    branches.push({
      label: match[1].trim(),
      condition: match[2].trim(),
      targetLabel: match[3].trim(),
    });
  }

  if (branches.length >= 2) {
    data.branches = branches.map((b, i) => ({
      id: `branch-${i + 1}`,
      label: b.label,
      condition: b.condition,
    }));
  }

  return {
    data,
    decisionInfo: {
      nodeId: id,
      branches,
    },
  };
}

/**
 * Detect natural language decision patterns
 */
function detectDecisionPattern(content: string): boolean {
  // "if X, go to Y" or "if X then Y, else Z"
  return /\bif\s+.+(?:go\s*to|proceed\s*to|then)\s+/i.test(content) ||
    /\bdepending\s+on\s+.+(?:go\s*to|proceed)/i.test(content) ||
    /\bbased\s+on\s+.+(?:take|follow)\s+(?:one\s+of\s+)?(?:the\s+following)?\s*paths?/i.test(content);
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
  const edges: WorkflowEdge[] = [];
  const loopInfos: LoopInfo[] = [];
  const decisionInfos: DecisionInfo[] = [];

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
  let previousNodeType = 'start';

  // Node label to ID map for resolving loop-back targets
  const labelToIdMap = new Map<string, string>();
  // Node ID to type map for handle resolution
  const nodeTypeMap = new Map<string, string>();
  nodeTypeMap.set('start', 'start');

  for (const section of sections) {
    // Detect section type
    const isPhase = section.match(/^###?\s*Phase/i);
    const isApproval = section.includes('AskUserQuestion') || section.match(/^###?\s*.*Approval/i);
    const isDecision = section.match(/^###?\s*Decision:/i) || detectDecisionPattern(section);

    if (isDecision && !isApproval) {
      const id = `node-${++nodeCounter}`;
      const { data: decisionData, decisionInfo } = parseDecisionSection(section, id);

      const decisionNode: DecisionNode = {
        id,
        type: 'decision',
        position: { x: 250, y: yPosition },
        data: decisionData,
      };
      nodes.push(decisionNode);
      labelToIdMap.set(decisionData.label.toLowerCase(), id);
      nodeTypeMap.set(id, 'decision');
      decisionInfos.push(decisionInfo);

      // Add edge from previous node
      edges.push({
        id: `edge-${previousNodeId}-${id}`,
        source: previousNodeId,
        sourceHandle: getSourceHandle(previousNodeType),
        target: id,
        targetHandle: getTargetHandle('decision'),
        data: { ...defaultEdgeData },
        animated: true,
        style: { strokeWidth: 2 },
      });

      previousNodeId = id;
      previousNodeType = 'decision';
      yPosition += 180;
    } else if (isPhase && !isApproval) {
      const id = `node-${++nodeCounter}`;
      const { data: phaseData, loopInfo } = parsePhaseSection(section, id);

      const phaseNode: PhaseNode = {
        id,
        type: 'phase',
        position: { x: 250, y: yPosition },
        data: phaseData,
      };
      nodes.push(phaseNode);
      labelToIdMap.set(phaseData.label.toLowerCase(), id);
      nodeTypeMap.set(id, 'phase');

      if (loopInfo) {
        loopInfos.push(loopInfo);
      }

      // Add edge from previous node
      edges.push({
        id: `edge-${previousNodeId}-${id}`,
        source: previousNodeId,
        sourceHandle: getSourceHandle(previousNodeType),
        target: id,
        targetHandle: getTargetHandle('phase'),
        data: { ...defaultEdgeData },
        animated: true,
        style: { strokeWidth: 2 },
      });

      previousNodeId = id;
      previousNodeType = 'phase';
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
      labelToIdMap.set(approvalData.label.toLowerCase(), id);
      nodeTypeMap.set(id, 'approval');

      // Add edge from previous node
      edges.push({
        id: `edge-${previousNodeId}-${id}`,
        source: previousNodeId,
        sourceHandle: getSourceHandle(previousNodeType),
        target: id,
        targetHandle: getTargetHandle('approval'),
        data: { ...defaultEdgeData },
        animated: true,
        style: { strokeWidth: 2 },
      });

      previousNodeId = id;
      previousNodeType = 'approval';
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
  nodeTypeMap.set('end', 'end');

  // Connect last node to end
  if (previousNodeId !== 'start') {
    edges.push({
      id: `edge-${previousNodeId}-end`,
      source: previousNodeId,
      sourceHandle: getSourceHandle(previousNodeType),
      target: 'end',
      targetHandle: getTargetHandle('end'),
      data: { ...defaultEdgeData },
      animated: true,
      style: { strokeWidth: 2 },
    });
  }

  // Add loop-back edges (these go to earlier nodes, creating loops)
  for (const loopInfo of loopInfos) {
    const targetId = labelToIdMap.get(loopInfo.targetLabel.toLowerCase());
    if (targetId) {
      const sourceType = nodeTypeMap.get(loopInfo.sourceId) || 'phase';
      const targetType = nodeTypeMap.get(targetId) || 'phase';
      edges.push({
        id: `edge-loop-${loopInfo.sourceId}-${targetId}`,
        source: loopInfo.sourceId,
        sourceHandle: getSourceHandle(sourceType),
        target: targetId,
        targetHandle: getTargetHandle(targetType),
        data: {
          ...defaultEdgeData,
          maxIterations: loopInfo.maxIterations,
          condition: loopInfo.condition,
        },
        animated: true,
        style: { strokeWidth: 2 },
      });
    } else {
      warnings.push(`Loop target "${loopInfo.targetLabel}" not found`);
    }
  }

  // Add warnings for incomplete parsing
  if (nodes.length <= 2) {
    warnings.push('No phases detected - the SKILL.md format may not be compatible');
  }

  return { nodes, edges, metadata, warnings };
}
