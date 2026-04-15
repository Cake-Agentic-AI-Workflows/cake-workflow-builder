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
  DecisionNodeData,
  WorkflowEdgeData,
  defaultWorkflowMetadata,
  defaultPhaseNodeData,
  defaultApprovalNodeData,
  defaultDecisionNodeData,
  defaultEdgeData,
  Direction,
  NodeType,
} from '@/types/workflow';

// Custom node types for React Flow
export type PhaseNode = Node<PhaseNodeData, 'phase'>;
export type ApprovalNode = Node<ApprovalNodeData, 'approval'>;
export type DecisionNode = Node<DecisionNodeData, 'decision'>;
export type StartNode = Node<StartEndNodeData, 'start'>;
export type EndNode = Node<StartEndNodeData, 'end'>;

export type WorkflowNode = PhaseNode | ApprovalNode | DecisionNode | StartNode | EndNode;
export type WorkflowEdge = Edge<WorkflowEdgeData>;

interface WorkflowState {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  metadata: WorkflowMetadata;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  highlightedEdgeId: string | null;
  radialMenu: {
    isOpen: boolean;
    position: { x: number; y: number };
    sourceNodeId: string | null;
    direction: Direction | null;
  };

  onNodesChange: OnNodesChange<WorkflowNode>;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  setSelectedNodeId: (id: string | null) => void;
  setSelectedEdgeId: (id: string | null) => void;
  updateNodeData: <T>(nodeId: string, data: Partial<T>) => void;
  updateEdgeData: (edgeId: string, data: Partial<WorkflowEdgeData>) => void;
  updateMetadata: (metadata: Partial<WorkflowMetadata>) => void;
  addPhaseNode: (position: { x: number; y: number }) => string;
  addApprovalNode: (position: { x: number; y: number }) => string;
  addDecisionNode: (position: { x: number; y: number }) => string;
  deleteNode: (nodeId: string) => void;
  resetWorkflow: () => void;
  loadWorkflow: (nodes: WorkflowNode[], edges: WorkflowEdge[], metadata: WorkflowMetadata) => void;
  openRadialMenu: (sourceNodeId: string, direction: Direction, position: { x: number; y: number }) => void;
  closeRadialMenu: () => void;
  addStartNode: (position: { x: number; y: number }) => string;
  addEndNode: (position: { x: number; y: number }) => string;
  addNodeByType: (type: NodeType, position: { x: number; y: number }) => string;
  hasEdgeBetween: (source: string, target: string) => boolean;
  highlightDuplicateEdge: (source: string, target: string) => void;
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

const initialEdges: WorkflowEdge[] = [];

let nodeIdCounter = 0;
const generateNodeId = () => `node-${++nodeIdCounter}`;

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  nodes: initialNodes,
  edges: initialEdges,
  metadata: { ...defaultWorkflowMetadata },
  selectedNodeId: null,
  selectedEdgeId: null,
  highlightedEdgeId: null,
  radialMenu: {
    isOpen: false,
    position: { x: 0, y: 0 },
    sourceNodeId: null,
    direction: null,
  },

  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes) as WorkflowNode[],
    });
  },

  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges) as WorkflowEdge[],
    });
  },

  onConnect: (connection: Connection) => {
    set({
      edges: addEdge(
        {
          ...connection,
          data: { ...defaultEdgeData },
          animated: true,
          style: { strokeWidth: 2 },
          markerEnd: {
            type: 'arrowclosed' as const,
            width: 20,
            height: 20,
          },
        },
        get().edges
      ),
    });
  },

  setSelectedNodeId: (id) => {
    set({ selectedNodeId: id, selectedEdgeId: null });
  },

  setSelectedEdgeId: (id) => {
    set({ selectedEdgeId: id, selectedNodeId: null });
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

  updateEdgeData: (edgeId: string, data: Partial<WorkflowEdgeData>) => {
    set({
      edges: get().edges.map((edge) =>
        edge.id === edgeId
          ? { ...edge, data: { ...edge.data, ...data } }
          : edge
      ) as WorkflowEdge[],
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

  addDecisionNode: (position) => {
    const id = generateNodeId();
    const newNode: DecisionNode = {
      id,
      type: 'decision',
      position,
      data: defaultDecisionNodeData(id),
    };
    set({
      nodes: [...get().nodes, newNode],
      selectedNodeId: id,
    });
    return id;
  },

  deleteNode: (nodeId) => {
    if (nodeId === 'start' || nodeId === 'end') return;
    const newNodes = get().nodes.filter((n) => n.id !== nodeId);
    const newEdges = get().edges.filter((e) => e.source !== nodeId && e.target !== nodeId);

    // Check if all content nodes are now deleted (only start/end remain)
    const hasContentNodes = newNodes.some(
      (n) => n.type !== 'start' && n.type !== 'end'
    );

    set({
      nodes: newNodes,
      edges: newEdges,
      selectedNodeId: get().selectedNodeId === nodeId ? null : get().selectedNodeId,
      // Reset metadata to defaults if no content nodes remain
      ...(hasContentNodes ? {} : { metadata: { ...defaultWorkflowMetadata } }),
    });
  },

  openRadialMenu: (sourceNodeId, direction, position) => {
    set({
      radialMenu: {
        isOpen: true,
        position,
        sourceNodeId,
        direction,
      },
    });
  },

  closeRadialMenu: () => {
    set({
      radialMenu: {
        isOpen: false,
        position: { x: 0, y: 0 },
        sourceNodeId: null,
        direction: null,
      },
    });
  },

  hasEdgeBetween: (source: string, target: string) => {
    return get().edges.some(
      (edge) => edge.source === source && edge.target === target
    );
  },

  highlightDuplicateEdge: (source: string, target: string) => {
    const existingEdge = get().edges.find(
      (edge) => edge.source === source && edge.target === target
    );
    if (existingEdge) {
      set({ highlightedEdgeId: existingEdge.id });
      setTimeout(() => {
        set({ highlightedEdgeId: null });
      }, 400);
    }
  },

  addStartNode: (position) => {
    const id = generateNodeId();
    const newNode: StartNode = {
      id,
      type: 'start',
      position,
      data: { id, label: 'Start' },
    };
    set({
      nodes: [...get().nodes, newNode],
      selectedNodeId: id,
    });
    return id;
  },

  addEndNode: (position) => {
    const id = generateNodeId();
    const newNode: EndNode = {
      id,
      type: 'end',
      position,
      data: { id, label: 'End' },
    };
    set({
      nodes: [...get().nodes, newNode],
      selectedNodeId: id,
    });
    return id;
  },

  addNodeByType: (type, position) => {
    switch (type) {
      case 'start':
        return get().addStartNode(position);
      case 'end':
        return get().addEndNode(position);
      case 'phase':
        return get().addPhaseNode(position);
      case 'approval':
        return get().addApprovalNode(position);
      case 'decision':
        return get().addDecisionNode(position);
      default:
        return get().addPhaseNode(position);
    }
  },

  resetWorkflow: () => {
    nodeIdCounter = 0;
    set({
      nodes: initialNodes,
      edges: initialEdges,
      metadata: { ...defaultWorkflowMetadata },
      selectedNodeId: null,
      selectedEdgeId: null,
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
      selectedEdgeId: null,
    });
  },
}));
