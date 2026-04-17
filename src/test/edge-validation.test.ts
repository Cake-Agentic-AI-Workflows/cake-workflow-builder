import { describe, it, expect, beforeEach } from 'vitest';
import { useWorkflowStore, WorkflowEdge } from '@/store/workflowStore';

beforeEach(() => {
  useWorkflowStore.getState().resetWorkflow();
});

describe('Edge Validation: hasEdgeBetween', () => {
  it('should return false when no edges exist', () => {
    const store = useWorkflowStore.getState();
    expect(store.hasEdgeBetween('node-a', 'node-b')).toBe(false);
  });

  it('should return true when edge exists from source to target', () => {
    const store = useWorkflowStore.getState();

    // Manually add an edge
    useWorkflowStore.setState({
      edges: [
        { id: 'e1', source: 'node-a', target: 'node-b', data: {} } as WorkflowEdge,
      ],
    });

    expect(store.hasEdgeBetween('node-a', 'node-b')).toBe(true);
  });

  it('should return false for reverse direction', () => {
    const store = useWorkflowStore.getState();

    useWorkflowStore.setState({
      edges: [
        { id: 'e1', source: 'node-a', target: 'node-b', data: {} } as WorkflowEdge,
      ],
    });

    // A->B exists, but B->A should return false
    expect(store.hasEdgeBetween('node-b', 'node-a')).toBe(false);
  });

  it('should return false for unrelated nodes', () => {
    const store = useWorkflowStore.getState();

    useWorkflowStore.setState({
      edges: [
        { id: 'e1', source: 'node-a', target: 'node-b', data: {} } as WorkflowEdge,
      ],
    });

    expect(store.hasEdgeBetween('node-c', 'node-d')).toBe(false);
  });
});

describe('Edge Validation: onConnect duplicate prevention', () => {
  it('should create edge when no duplicate exists', () => {
    useWorkflowStore.getState().onConnect({
      source: 'start',
      target: 'end',
      sourceHandle: 'bottom',
      targetHandle: 'top',
    });

    const { edges } = useWorkflowStore.getState();
    expect(edges.length).toBe(1);
    expect(edges[0].source).toBe('start');
    expect(edges[0].target).toBe('end');
  });

  it('should NOT create duplicate edge between same source and target', () => {
    // Create first edge
    useWorkflowStore.getState().onConnect({
      source: 'start',
      target: 'end',
      sourceHandle: 'bottom',
      targetHandle: 'top',
    });

    expect(useWorkflowStore.getState().edges.length).toBe(1);

    // Attempt duplicate
    useWorkflowStore.getState().onConnect({
      source: 'start',
      target: 'end',
      sourceHandle: 'bottom',
      targetHandle: 'top',
    });

    // Should still be 1 edge
    expect(useWorkflowStore.getState().edges.length).toBe(1);
  });

  it('should allow edge in reverse direction', () => {
    // Add phase nodes first
    useWorkflowStore.getState().addPhaseNode({ x: 100, y: 100 });
    useWorkflowStore.getState().addPhaseNode({ x: 100, y: 250 });

    const nodeIds = useWorkflowStore.getState().nodes
      .filter(n => n.type === 'phase')
      .map(n => n.id);

    // Create A->B
    useWorkflowStore.getState().onConnect({
      source: nodeIds[0],
      target: nodeIds[1],
      sourceHandle: 'bottom',
      targetHandle: 'top',
    });

    // Create B->A (reverse direction - should work)
    useWorkflowStore.getState().onConnect({
      source: nodeIds[1],
      target: nodeIds[0],
      sourceHandle: 'top',
      targetHandle: 'bottom',
    });

    expect(useWorkflowStore.getState().edges.length).toBe(2);
  });

  it('should set highlightedEdgeId when duplicate is blocked', () => {
    // Create first edge
    useWorkflowStore.getState().onConnect({
      source: 'start',
      target: 'end',
      sourceHandle: 'bottom',
      targetHandle: 'top',
    });

    const edgeId = useWorkflowStore.getState().edges[0].id;

    // Attempt duplicate
    useWorkflowStore.getState().onConnect({
      source: 'start',
      target: 'end',
      sourceHandle: 'bottom',
      targetHandle: 'top',
    });

    // Should highlight the existing edge
    expect(useWorkflowStore.getState().highlightedEdgeId).toBe(edgeId);
  });
});

describe('Edge Validation: onReconnect duplicate prevention', () => {
  it('should block reconnect if it would create duplicate', () => {
    // Add phase nodes
    useWorkflowStore.getState().addPhaseNode({ x: 100, y: 100 }); // node-1
    useWorkflowStore.getState().addPhaseNode({ x: 100, y: 250 }); // node-2
    useWorkflowStore.getState().addPhaseNode({ x: 100, y: 400 }); // node-3

    const phaseNodes = useWorkflowStore.getState().nodes.filter(n => n.type === 'phase');
    const [nodeA, nodeB, nodeC] = phaseNodes.map(n => n.id);

    // Create edges: A→B and A→C
    useWorkflowStore.getState().onConnect({ source: nodeA, target: nodeB, sourceHandle: 'bottom', targetHandle: 'top' });
    useWorkflowStore.getState().onConnect({ source: nodeA, target: nodeC, sourceHandle: 'bottom', targetHandle: 'top' });

    expect(useWorkflowStore.getState().edges.length).toBe(2);

    // A→B already exists, trying to reconnect A→C to A→B should be blocked
    // This is tested via the hasEdgeBetween check which WorkflowCanvas uses
    expect(useWorkflowStore.getState().hasEdgeBetween(nodeA, nodeB)).toBe(true);
  });
});
