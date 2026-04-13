import { describe, it, expect, beforeEach } from 'vitest';
import { useWorkflowStore, WorkflowNode, WorkflowEdge } from '@/store/workflowStore';
import { generateSkillMd } from '@/lib/skillGenerator';
import { WorkflowMetadata, defaultPhaseNodeData } from '@/types/workflow';

beforeEach(() => {
  useWorkflowStore.getState().resetWorkflow();
});

describe('Fix: Metadata should reset when all content nodes are deleted', () => {
  it('should reset metadata to defaults when all content nodes are deleted', () => {
    const store = useWorkflowStore.getState();

    // Simulate loading a template (like architecture-diagram)
    const templateNodes: WorkflowNode[] = [
      { id: 'start', type: 'start', position: { x: 250, y: 50 }, data: { id: 'start', label: 'Start' }, deletable: false },
      { id: 'node-1', type: 'phase', position: { x: 250, y: 150 }, data: defaultPhaseNodeData('node-1') },
      { id: 'node-2', type: 'phase', position: { x: 250, y: 300 }, data: defaultPhaseNodeData('node-2') },
      { id: 'end', type: 'end', position: { x: 250, y: 450 }, data: { id: 'end', label: 'End' }, deletable: false },
    ];
    templateNodes[1].data.label = 'Template Phase 1';
    templateNodes[2].data.label = 'Template Phase 2';

    const templateEdges: WorkflowEdge[] = [
      { id: 'e1', source: 'start', target: 'node-1', data: {} },
      { id: 'e2', source: 'node-1', target: 'node-2', data: {} },
      { id: 'e3', source: 'node-2', target: 'end', data: {} },
    ];

    const templateMetadata: WorkflowMetadata = {
      name: 'architecture-diagram',
      description: 'Analyze codebase and generate architecture diagrams',
      version: '1.0.0',
      author: 'Template Author',
      tags: ['architecture', 'diagrams'],
      userInvocable: true,
    };

    // Load template
    store.loadWorkflow(templateNodes, templateEdges, templateMetadata);
    expect(useWorkflowStore.getState().metadata.name).toBe('architecture-diagram');

    // Delete first template node - metadata should NOT reset yet (one content node remains)
    store.deleteNode('node-1');
    expect(useWorkflowStore.getState().metadata.name).toBe('architecture-diagram');

    // Delete last template node - NOW metadata SHOULD reset to defaults
    store.deleteNode('node-2');

    // After deleting all content nodes, metadata should reset
    const { metadata } = useWorkflowStore.getState();
    expect(metadata.name).toBe('my-workflow'); // Default name
    expect(metadata.description).toContain('custom workflow'); // Default description
  });

  it('should NOT reset metadata when some content nodes remain', () => {
    const store = useWorkflowStore.getState();

    // Load a template with 3 content nodes
    const templateNodes: WorkflowNode[] = [
      { id: 'start', type: 'start', position: { x: 250, y: 50 }, data: { id: 'start', label: 'Start' }, deletable: false },
      { id: 'node-1', type: 'phase', position: { x: 250, y: 150 }, data: defaultPhaseNodeData('node-1') },
      { id: 'node-2', type: 'phase', position: { x: 250, y: 300 }, data: defaultPhaseNodeData('node-2') },
      { id: 'node-3', type: 'phase', position: { x: 250, y: 450 }, data: defaultPhaseNodeData('node-3') },
      { id: 'end', type: 'end', position: { x: 250, y: 600 }, data: { id: 'end', label: 'End' }, deletable: false },
    ];

    const templateMetadata: WorkflowMetadata = {
      name: 'my-template',
      description: 'A template workflow',
      version: '2.0.0',
      author: 'Test',
      tags: ['test'],
      userInvocable: true,
    };

    store.loadWorkflow(templateNodes, [], templateMetadata);

    // Delete one node - metadata should persist
    store.deleteNode('node-1');
    expect(useWorkflowStore.getState().metadata.name).toBe('my-template');

    // Delete another - still one remains, metadata should persist
    store.deleteNode('node-2');
    expect(useWorkflowStore.getState().metadata.name).toBe('my-template');

    // Delete last content node - NOW metadata should reset
    store.deleteNode('node-3');
    expect(useWorkflowStore.getState().metadata.name).toBe('my-workflow');
  });

  it('should export user workflow correctly after deleting template and adding new nodes', () => {
    const store = useWorkflowStore.getState();

    // Load template
    const templateNodes: WorkflowNode[] = [
      { id: 'start', type: 'start', position: { x: 250, y: 50 }, data: { id: 'start', label: 'Start' }, deletable: false },
      { id: 'node-1', type: 'phase', position: { x: 250, y: 150 }, data: defaultPhaseNodeData('node-1') },
      { id: 'end', type: 'end', position: { x: 250, y: 300 }, data: { id: 'end', label: 'End' }, deletable: false },
    ];

    const templateMetadata: WorkflowMetadata = {
      name: 'architecture-diagram',
      description: 'Template description',
      version: '1.0.0',
      author: 'Template Author',
      tags: ['template'],
      userInvocable: true,
    };

    store.loadWorkflow(templateNodes, [], templateMetadata);

    // Delete all template content nodes
    store.deleteNode('node-1');

    // Metadata should now be reset
    expect(useWorkflowStore.getState().metadata.name).toBe('my-workflow');

    // Add user's nodes with a loop
    const userNode1 = store.addPhaseNode({ x: 250, y: 150 });
    const userNode2 = store.addPhaseNode({ x: 250, y: 300 });
    store.updateNodeData(userNode1, { label: 'User Step 1' });
    store.updateNodeData(userNode2, { label: 'User Step 2' });

    // Create edges including loop
    store.onConnect({ source: 'start', target: userNode1, sourceHandle: 'bottom', targetHandle: 'top' });
    store.onConnect({ source: userNode1, target: userNode2, sourceHandle: 'bottom', targetHandle: 'top' });
    store.onConnect({ source: userNode2, target: 'end', sourceHandle: 'bottom', targetHandle: 'top' });
    store.onConnect({ source: userNode2, target: userNode1, sourceHandle: 'top', targetHandle: 'bottom' }); // Loop

    const { nodes, edges, metadata } = useWorkflowStore.getState();
    const output = generateSkillMd({ nodes, edges, metadata });

    // Should NOT contain template metadata
    expect(output).not.toContain('architecture-diagram');
    expect(output).not.toContain('Template Author');

    // Should contain default/user workflow metadata
    expect(output).toContain('name: my-workflow');

    // Should contain user's phases
    expect(output).toContain('User Step 1');
    expect(output).toContain('User Step 2');

    // Should contain loop control
    expect(output).toContain('**Loop Control:**');
    expect(output).toContain('User Step 1'); // Loop target
  });
});

describe('Bug: Loop edges not exported', () => {
  it('should export loop control section when loop edge exists', () => {
    const store = useWorkflowStore.getState();

    // Create fresh workflow with loop
    const node1 = store.addPhaseNode({ x: 250, y: 150 });
    const node2 = store.addPhaseNode({ x: 250, y: 300 });

    store.updateNodeData(node1, { label: 'Step A' });
    store.updateNodeData(node2, { label: 'Step B' });

    // Connect: start -> node1 -> node2 -> end
    store.onConnect({ source: 'start', target: node1, sourceHandle: 'bottom', targetHandle: 'top' });
    store.onConnect({ source: node1, target: node2, sourceHandle: 'bottom', targetHandle: 'top' });
    store.onConnect({ source: node2, target: 'end', sourceHandle: 'bottom', targetHandle: 'top' });

    // Add loop: node2 -> node1 (going from y=300 to y=150, so target.y < source.y)
    store.onConnect({ source: node2, target: node1, sourceHandle: 'top', targetHandle: 'bottom' });

    const { nodes, edges, metadata } = useWorkflowStore.getState();

    console.log('Nodes:', nodes.map(n => ({ id: n.id, type: n.type, y: n.position.y })));
    console.log('Edges:', edges.map(e => ({
      source: e.source,
      target: e.target,
      sourceY: nodes.find(n => n.id === e.source)?.position.y,
      targetY: nodes.find(n => n.id === e.target)?.position.y,
    })));

    // Check loop edge detection logic
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const loopEdges = edges.filter(e => {
      const source = nodeMap.get(e.source);
      const target = nodeMap.get(e.target);
      if (!source || !target) return false;
      const isLoop = target.position.y < source.position.y;
      console.log(`Edge ${e.source}->${e.target}: sourceY=${source.position.y}, targetY=${target.position.y}, isLoop=${isLoop}`);
      return isLoop;
    });

    expect(loopEdges.length).toBe(1);
    expect(loopEdges[0].source).toBe(node2);
    expect(loopEdges[0].target).toBe(node1);

    const output = generateSkillMd({ nodes, edges, metadata });
    console.log('\n=== OUTPUT ===\n', output);

    // Should have loop control
    expect(output).toContain('**Loop Control:**');
  });
});
