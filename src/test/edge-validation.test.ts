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
