import { create } from 'zustand';
import {
  Node,
  Edge,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Connection,
} from '@xyflow/react';
import {
  WorkflowMetadata,
  PhaseNodeData,
  ApprovalNodeData,
  StartEndNodeData,
  defaultWorkflowMetadata,
  defaultPhaseNodeData,
  defaultApprovalNodeData,
} from '@/types/workflow';

// Custom node types for React Flow
export type PhaseNode = Node<PhaseNodeData, 'phase'>;
export type ApprovalNode = Node<ApprovalNodeData, 'approval'>;
export type StartNode = Node<StartEndNodeData, 'start'>;
export type EndNode = Node<StartEndNodeData, 'end'>;

export type WorkflowNode = PhaseNode | ApprovalNode | StartNode | EndNode;

interface WorkflowState {
  // Workflow data
  nodes: WorkflowNode[];
  edges: Edge[];
  metadata: WorkflowMetadata;
  selectedNodeId: string | null;

  // Actions
  onNodesChange: OnNodesChange<WorkflowNode>;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  setSelectedNodeId: (id: string | null) => void;
  updateNodeData: <T>(nodeId: string, data: Partial<T>) => void;
  updateMetadata: (metadata: Partial<WorkflowMetadata>) => void;
  addPhaseNode: (position: { x: number; y: number }) => string;
  addApprovalNode: (position: { x: number; y: number }) => string;
  deleteNode: (nodeId: string) => void;
  resetWorkflow: () => void;
  loadWorkflow: (nodes: WorkflowNode[], edges: Edge[], metadata: WorkflowMetadata) => void;
}

// Initial nodes for a new workflow
const initialNodes: WorkflowNode[] = [
  {
    id: 'start',
    type: 'start',
    position: { x: 250, y: 50 },
    data: { id: 'start', label: 'Start' },
    deletable: false,
  },
  {
    id: 'end',
    type: 'end',
    position: { x: 250, y: 400 },
    data: { id: 'end', label: 'End' },
    deletable: false,
  },
];

const initialEdges: Edge[] = [];

let nodeIdCounter = 0;
const generateNodeId = () => `node-${++nodeIdCounter}`;

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  nodes: initialNodes,
  edges: initialEdges,
  metadata: { ...defaultWorkflowMetadata },
  selectedNodeId: null,

  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes) as WorkflowNode[],
    });
  },

  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },

  onConnect: (connection: Connection) => {
    set({
      edges: addEdge(
        {
          ...connection,
          animated: true,
          style: { strokeWidth: 2 },
        },
        get().edges
      ),
    });
  },

  setSelectedNodeId: (id) => {
    set({ selectedNodeId: id });
  },

  updateNodeData: <T,>(nodeId: string, data: Partial<T>) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...data } }
          : node
      ) as WorkflowNode[],
    });
  },

  updateMetadata: (metadata) => {
    set({
      metadata: { ...get().metadata, ...metadata },
    });
  },

  addPhaseNode: (position) => {
    const id = generateNodeId();
    const newNode: PhaseNode = {
      id,
      type: 'phase',
      position,
      data: defaultPhaseNodeData(id),
    };
    set({
      nodes: [...get().nodes, newNode],
      selectedNodeId: id,
    });
    return id;
  },

  addApprovalNode: (position) => {
    const id = generateNodeId();
    const newNode: ApprovalNode = {
      id,
      type: 'approval',
      position,
      data: defaultApprovalNodeData(id),
    };
    set({
      nodes: [...get().nodes, newNode],
      selectedNodeId: id,
    });
    return id;
  },

  deleteNode: (nodeId) => {
    if (nodeId === 'start' || nodeId === 'end') return;
    set({
      nodes: get().nodes.filter((n) => n.id !== nodeId),
      edges: get().edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
      selectedNodeId: get().selectedNodeId === nodeId ? null : get().selectedNodeId,
    });
  },

  resetWorkflow: () => {
    nodeIdCounter = 0;
    set({
      nodes: initialNodes,
      edges: initialEdges,
      metadata: { ...defaultWorkflowMetadata },
      selectedNodeId: null,
    });
  },

  loadWorkflow: (nodes, edges, metadata) => {
    // Update counter to avoid ID collisions
    const maxId = nodes.reduce((max, node) => {
      const match = node.id.match(/node-(\d+)/);
      return match ? Math.max(max, parseInt(match[1])) : max;
    }, 0);
    nodeIdCounter = maxId;

    set({
      nodes,
      edges,
      metadata,
      selectedNodeId: null,
    });
  },
}));
