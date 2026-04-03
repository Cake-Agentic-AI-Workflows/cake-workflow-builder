// Workflow type definitions

export type AgentType = 'Explore' | 'Plan' | 'general-purpose' | 'none';
export type ModelType = 'opus' | 'sonnet' | 'haiku';
export type ExecutionMode = 'parallel' | 'sequential';
export type NodeType = 'start' | 'phase' | 'approval' | 'end';

export interface AgentConfig {
  type: AgentType;
  model: ModelType;
  prompt: string;
}

export interface SubagentConfig {
  enabled: boolean;
  condition: string;
  execution: ExecutionMode;
  maxIterations: number;
  timeout: number; // seconds
}

export interface ContextConfig {
  inputs: string[];
  outputs: string[];
  sizeLimit?: number;
}

export interface PhaseNodeData {
  [key: string]: unknown;
  id: string;
  label: string;
  description: string;
  agent: AgentConfig;
  subagent: SubagentConfig;
  context: ContextConfig;
}

export interface ApprovalOption {
  label: string;
  description: string;
}

export interface ApprovalNodeData {
  [key: string]: unknown;
  id: string;
  label: string;
  question: string;
  options: ApprovalOption[];
}

export interface StartEndNodeData {
  [key: string]: unknown;
  id: string;
  label: string;
}

export interface WorkflowMetadata {
  name: string;
  description: string;
  version: string;
  author: string;
  tags: string[];
  userInvocable: boolean;
}

// Default values for new nodes
export const defaultAgentConfig: AgentConfig = {
  type: 'general-purpose',
  model: 'sonnet',
  prompt: '',
};

export const defaultSubagentConfig: SubagentConfig = {
  enabled: false,
  condition: '',
  execution: 'sequential',
  maxIterations: 3,
  timeout: 120,
};

export const defaultContextConfig: ContextConfig = {
  inputs: [],
  outputs: [],
  sizeLimit: undefined,
};

export const defaultPhaseNodeData = (id: string): PhaseNodeData => ({
  id,
  label: 'New Phase',
  description: '',
  agent: { ...defaultAgentConfig },
  subagent: { ...defaultSubagentConfig },
  context: { ...defaultContextConfig },
});

export const defaultApprovalNodeData = (id: string): ApprovalNodeData => ({
  id,
  label: 'Approval Gate',
  question: 'Do you want to proceed?',
  options: [
    { label: 'Yes', description: 'Continue to the next phase' },
    { label: 'No', description: 'Stop the workflow' },
  ],
});

export const defaultWorkflowMetadata: WorkflowMetadata = {
  name: 'my-workflow',
  description: 'A custom workflow created with Cake Workflow Builder',
  version: '1.0.0',
  author: '',
  tags: ['generated'],
  userInvocable: true,
};
