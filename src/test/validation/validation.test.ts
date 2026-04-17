// src/test/validation/validation.test.ts
import { describe, it, expect } from 'vitest';
import { parseSkillMd } from '@/lib/skillParser';
import { validateWorkflow, generateSkillMd } from '@/lib/skillGenerator';
import { WorkflowNode, WorkflowEdge } from '@/store/workflowStore';
import {
  WorkflowMetadata,
  defaultWorkflowMetadata,
  defaultPhaseNodeData,
  defaultApprovalNodeData,
  defaultDecisionNodeData,
  defaultEdgeData,
} from '@/types/workflow';

/**
 * Validation warning tests for the skill parser and generator.
 *
 * Tests are organized by spec sections:
 * - 2.9 Parser Warnings
 * - 5.1 Orphaned Nodes
 * - 5.2 Unreachable Paths
 * - 5.3 Loop Edge Cases
 * - 5.4 Decision Edge Cases
 * - 5.5 Metadata Edge Cases
 *
 * Some warnings from the spec are not yet implemented - those tests
 * are marked with .skip and documented with TODO comments.
 */
describe('Validation: Warnings', () => {
  // Helper to wrap markdown with valid frontmatter
  const wrapWithFrontmatter = (content: string) => `---
name: test-workflow
description: Test workflow
---

${content}`;

  // Helper to create minimal workflow structure
  const createWorkflow = (
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    metadata?: Partial<WorkflowMetadata>
  ) => ({
    nodes,
    edges,
    metadata: { ...defaultWorkflowMetadata, ...metadata },
  });

  // Helper to create a basic connected workflow
  const createBasicWorkflow = (): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } => {
    const startNode: WorkflowNode = {
      id: 'start',
      type: 'start',
      position: { x: 0, y: 0 },
      data: { id: 'start', label: 'Start' },
      deletable: false,
    };
    const phase1: WorkflowNode = {
      id: 'node-1',
      type: 'phase',
      position: { x: 0, y: 100 },
      data: { ...defaultPhaseNodeData('node-1'), label: 'Phase 1', description: 'Do something' },
    };
    const endNode: WorkflowNode = {
      id: 'end',
      type: 'end',
      position: { x: 0, y: 200 },
      data: { id: 'end', label: 'End' },
      deletable: false,
    };
    const edges: WorkflowEdge[] = [
      { id: 'e1', source: 'start', target: 'node-1', data: { ...defaultEdgeData } },
      { id: 'e2', source: 'node-1', target: 'end', data: { ...defaultEdgeData } },
    ];
    return { nodes: [startNode, phase1, endNode], edges };
  };

  // ===========================
  // Section 2.9: Parser Warnings
  // ===========================
  describe('2.9 parser warnings', () => {
    it('warns when loop target not found', () => {
      const md = wrapWithFrontmatter(`
### Phase 1: Research

Do research.

**Loop Control:**
- Repeat back to "NonExistent Phase", up to 3 times
`);
      const result = parseSkillMd(md);
      expect(result.warnings.some((w) => w.includes('not found'))).toBe(true);
      expect(result.warnings.some((w) => w.includes('NonExistent Phase'))).toBe(true);
    });

    it('warns when no phases detected', () => {
      const md = wrapWithFrontmatter('Just some random text without any phase headers.');
      const result = parseSkillMd(md);
      expect(result.warnings.some((w) => w.includes('No phases detected'))).toBe(true);
    });

    it('warns with correct message for loop target not found', () => {
      const md = wrapWithFrontmatter(`
### Phase 1: Research

Do research.

### Phase 2: Validate

Do validation.

**Loop Control:**
- Repeat back to "Missing", up to 3 times
`);
      const result = parseSkillMd(md);
      // Check the exact warning format from the parser
      expect(result.warnings).toContain('Loop target "Missing" not found');
    });

    // TODO: Not implemented - Decision branch target resolution warnings
    it.skip('warns when decision branch target not found', () => {
      const md = wrapWithFrontmatter(`
### Phase 1: Research

Do research.

### Decision: Choose Path

**What should happen next?**

- **Success**: When everything works
  - Go to: NonExistent Phase
- **Failure**: When something fails
  - Go to: Also NonExistent
`);
      const result = parseSkillMd(md);
      expect(result.warnings.some((w) => w.includes('not found'))).toBe(true);
    });
  });

  // ===========================
  // Section 5.1: Orphaned Nodes
  // ===========================
  describe('5.1 orphaned nodes', () => {
    it('warns when phase has no connections', () => {
      const { nodes, edges } = createBasicWorkflow();

      // Add an orphaned phase node
      const orphanedPhase: WorkflowNode = {
        id: 'node-orphan',
        type: 'phase',
        position: { x: 300, y: 100 },
        data: { ...defaultPhaseNodeData('node-orphan'), label: 'Orphaned Phase' },
      };
      nodes.push(orphanedPhase);

      const workflow = createWorkflow(nodes, edges, { name: 'test', author: 'test' });
      const warnings = validateWorkflow(workflow);

      expect(warnings.some((w) => w.includes('Orphaned Phase') && w.includes('not connected'))).toBe(
        true
      );
    });

    it('warns when approval node has no connections', () => {
      const { nodes, edges } = createBasicWorkflow();

      // Add an orphaned approval node
      const orphanedApproval: WorkflowNode = {
        id: 'node-orphan-approval',
        type: 'approval',
        position: { x: 300, y: 100 },
        data: { ...defaultApprovalNodeData('node-orphan-approval'), label: 'Orphaned Approval' },
      };
      nodes.push(orphanedApproval);

      const workflow = createWorkflow(nodes, edges, { name: 'test', author: 'test' });
      const warnings = validateWorkflow(workflow);

      expect(warnings.some((w) => w.includes('Orphaned Approval') && w.includes('not connected'))).toBe(
        true
      );
    });

    it('warns when decision node has no connections', () => {
      const { nodes, edges } = createBasicWorkflow();

      // Add an orphaned decision node
      const orphanedDecision: WorkflowNode = {
        id: 'node-orphan-decision',
        type: 'decision',
        position: { x: 300, y: 100 },
        data: { ...defaultDecisionNodeData('node-orphan-decision'), label: 'Orphaned Decision' },
      };
      nodes.push(orphanedDecision);

      const workflow = createWorkflow(nodes, edges, { name: 'test', author: 'test' });
      const warnings = validateWorkflow(workflow);

      expect(warnings.some((w) => w.includes('Orphaned Decision') && w.includes('not connected'))).toBe(
        true
      );
    });

    // TODO: Not implemented - decision branch with no outgoing edge
    it.skip('warns when decision branch has no outgoing edge', () => {
      // A decision node where one branch doesn't connect to anything
      const startNode: WorkflowNode = {
        id: 'start',
        type: 'start',
        position: { x: 0, y: 0 },
        data: { id: 'start', label: 'Start' },
        deletable: false,
      };
      const decisionNode: WorkflowNode = {
        id: 'node-decision',
        type: 'decision',
        position: { x: 0, y: 100 },
        data: {
          ...defaultDecisionNodeData('node-decision'),
          branches: [
            { id: 'branch-1', label: 'Path A', condition: 'Condition A' },
            { id: 'branch-2', label: 'Path B', condition: 'Condition B' },
          ],
        },
      };
      const phase1: WorkflowNode = {
        id: 'node-1',
        type: 'phase',
        position: { x: 0, y: 200 },
        data: { ...defaultPhaseNodeData('node-1'), label: 'Phase 1' },
      };
      const endNode: WorkflowNode = {
        id: 'end',
        type: 'end',
        position: { x: 0, y: 300 },
        data: { id: 'end', label: 'End' },
        deletable: false,
      };

      // Only connect branch-1, leave branch-2 unconnected
      const edges: WorkflowEdge[] = [
        { id: 'e1', source: 'start', target: 'node-decision', data: { ...defaultEdgeData } },
        {
          id: 'e2',
          source: 'node-decision',
          sourceHandle: 'branch-1',
          target: 'node-1',
          data: { ...defaultEdgeData },
        },
        { id: 'e3', source: 'node-1', target: 'end', data: { ...defaultEdgeData } },
      ];

      const workflow = createWorkflow([startNode, decisionNode, phase1, endNode], edges, {
        name: 'test',
        author: 'test',
      });
      const warnings = validateWorkflow(workflow);

      expect(warnings.some((w) => w.includes('Path B') && w.includes('no outgoing edge'))).toBe(true);
    });
  });

  // ===========================
  // Section 5.2: Unreachable Paths
  // ===========================
  describe('5.2 unreachable paths', () => {
    // TODO: Not implemented - warning about unreachable nodes (only checks path to end)
    it.skip('warns when node is not reachable from start', () => {
      const startNode: WorkflowNode = {
        id: 'start',
        type: 'start',
        position: { x: 0, y: 0 },
        data: { id: 'start', label: 'Start' },
        deletable: false,
      };
      const phase1: WorkflowNode = {
        id: 'node-1',
        type: 'phase',
        position: { x: 0, y: 100 },
        data: { ...defaultPhaseNodeData('node-1'), label: 'Phase 1', description: 'Reachable' },
      };
      const phase2: WorkflowNode = {
        id: 'node-2',
        type: 'phase',
        position: { x: 0, y: 200 },
        data: { ...defaultPhaseNodeData('node-2'), label: 'Unreachable Phase', description: 'Not reachable' },
      };
      const endNode: WorkflowNode = {
        id: 'end',
        type: 'end',
        position: { x: 0, y: 300 },
        data: { id: 'end', label: 'End' },
        deletable: false,
      };

      // Phase 2 is connected to end but not reachable from start
      const edges: WorkflowEdge[] = [
        { id: 'e1', source: 'start', target: 'node-1', data: { ...defaultEdgeData } },
        { id: 'e2', source: 'node-1', target: 'end', data: { ...defaultEdgeData } },
        { id: 'e3', source: 'node-2', target: 'end', data: { ...defaultEdgeData } },
      ];

      const workflow = createWorkflow([startNode, phase1, phase2, endNode], edges, {
        name: 'test',
        author: 'test',
      });
      const warnings = validateWorkflow(workflow);

      expect(warnings.some((w) => w.includes('Unreachable Phase') && w.includes('unreachable'))).toBe(
        true
      );
    });

    it('warns when there is no path from start to end', () => {
      const startNode: WorkflowNode = {
        id: 'start',
        type: 'start',
        position: { x: 0, y: 0 },
        data: { id: 'start', label: 'Start' },
        deletable: false,
      };
      const phase1: WorkflowNode = {
        id: 'node-1',
        type: 'phase',
        position: { x: 0, y: 100 },
        data: { ...defaultPhaseNodeData('node-1'), label: 'Disconnected Phase', description: 'No path to end' },
      };
      const endNode: WorkflowNode = {
        id: 'end',
        type: 'end',
        position: { x: 0, y: 200 },
        data: { id: 'end', label: 'End' },
        deletable: false,
      };

      // Start connects to phase1, but phase1 doesn't connect to end
      const edges: WorkflowEdge[] = [
        { id: 'e1', source: 'start', target: 'node-1', data: { ...defaultEdgeData } },
        // Missing edge from node-1 to end
      ];

      const workflow = createWorkflow([startNode, phase1, endNode], edges, {
        name: 'test',
        author: 'test',
      });
      const warnings = validateWorkflow(workflow);

      expect(warnings.some((w) => w.includes('No path from Start to End'))).toBe(true);
    });

    it('valid workflow has path from start to end', () => {
      const { nodes, edges } = createBasicWorkflow();
      const workflow = createWorkflow(nodes, edges, {
        name: 'valid-workflow',
        description: 'A properly connected workflow',
        author: 'test',
      });
      const warnings = validateWorkflow(workflow);

      expect(warnings.some((w) => w.includes('No path from Start to End'))).toBe(false);
    });
  });

  // ===========================
  // Section 5.3: Loop Edge Cases
  // ===========================
  describe('5.3 loop edge cases', () => {
    // TODO: Not implemented - potential infinite loop warning
    it.skip('warns about potential infinite loop with no exit path', () => {
      // A loop that has no condition or way to exit
      const startNode: WorkflowNode = {
        id: 'start',
        type: 'start',
        position: { x: 0, y: 0 },
        data: { id: 'start', label: 'Start' },
        deletable: false,
      };
      const phase1: WorkflowNode = {
        id: 'node-1',
        type: 'phase',
        position: { x: 0, y: 100 },
        data: { ...defaultPhaseNodeData('node-1'), label: 'Infinite Loop Phase' },
      };
      const endNode: WorkflowNode = {
        id: 'end',
        type: 'end',
        position: { x: 0, y: 200 },
        data: { id: 'end', label: 'End' },
        deletable: false,
      };

      // Self-loop with no maxIterations defined (or very high number)
      const edges: WorkflowEdge[] = [
        { id: 'e1', source: 'start', target: 'node-1', data: { ...defaultEdgeData } },
        { id: 'e2', source: 'node-1', target: 'end', data: { ...defaultEdgeData } },
        {
          id: 'e-loop',
          source: 'node-1',
          target: 'node-1',
          data: { ...defaultEdgeData, maxIterations: undefined },
        },
      ];

      const workflow = createWorkflow([startNode, phase1, endNode], edges, {
        name: 'test',
        author: 'test',
      });
      const warnings = validateWorkflow(workflow);

      expect(warnings.some((w) => w.includes('infinite loop'))).toBe(true);
    });

    it('preserves multiple loops to same target independently', () => {
      const md = wrapWithFrontmatter(`
### Phase 1: Research

Do research.

### Phase 2: Process

Process data. Retry up to 3 times.

### Phase 3: Validate

**Loop Control:**
- Repeat back to "Research", up to 5 times
`);
      const result = parseSkillMd(md);

      // Should have two loop edges: self-loop from Process, and loop from Validate to Research
      const loopEdges = result.edges.filter((e) => e.id.startsWith('edge-loop-'));
      expect(loopEdges.length).toBe(2);

      // Check they have different maxIterations
      const selfLoop = loopEdges.find((e) => e.source === e.target);
      const backLoop = loopEdges.find((e) => e.source !== e.target);

      expect(selfLoop?.data?.maxIterations).toBe(3);
      expect(backLoop?.data?.maxIterations).toBe(5);
    });

    // TODO: Not implemented - loop from decision branch
    it.skip('handles loop from decision branch correctly', () => {
      // A decision node with one branch looping back
      const md = wrapWithFrontmatter(`
### Phase 1: Research

Do research.

### Decision: Check Results

**Are the results valid?**

- **Yes**: Results are valid
  - Go to: End
- **No**: Results are invalid
  - Go to: Research
`);
      const result = parseSkillMd(md);

      // The "No" branch should create a loop edge back to Research
      const loopEdges = result.edges.filter((e) => e.id.includes('loop'));
      expect(loopEdges.length).toBe(1);
    });

    it('defaults maxIterations to 3 when undefined in natural language', () => {
      const md = wrapWithFrontmatter(`
### Phase 1: Research

Do research.

### Phase 2: Validate

Go back to Research, if needed.
`);
      const result = parseSkillMd(md);

      const loopEdges = result.edges.filter((e) => e.id.startsWith('edge-loop-'));
      expect(loopEdges.length).toBe(1);
      expect(loopEdges[0].data?.maxIterations).toBe(3);
    });

    it('preserves explicit maxIterations value', () => {
      const md = wrapWithFrontmatter(`
### Phase 1: Research

Do research.

### Phase 2: Validate

Go back to Research, up to 7 times.
`);
      const result = parseSkillMd(md);

      const loopEdges = result.edges.filter((e) => e.id.startsWith('edge-loop-'));
      expect(loopEdges[0].data?.maxIterations).toBe(7);
    });

    it('generator outputs maxIterations with default of 3', () => {
      const startNode: WorkflowNode = {
        id: 'start',
        type: 'start',
        position: { x: 0, y: 0 },
        data: { id: 'start', label: 'Start' },
        deletable: false,
      };
      const phase1: WorkflowNode = {
        id: 'node-1',
        type: 'phase',
        position: { x: 0, y: 100 },
        data: { ...defaultPhaseNodeData('node-1'), label: 'Research', description: 'Do research' },
      };
      const phase2: WorkflowNode = {
        id: 'node-2',
        type: 'phase',
        position: { x: 0, y: 200 },
        data: { ...defaultPhaseNodeData('node-2'), label: 'Validate', description: 'Do validation' },
      };
      const endNode: WorkflowNode = {
        id: 'end',
        type: 'end',
        position: { x: 0, y: 300 },
        data: { id: 'end', label: 'End' },
        deletable: false,
      };

      // Loop edge with undefined maxIterations (should default to 3)
      const edges: WorkflowEdge[] = [
        { id: 'e1', source: 'start', target: 'node-1', data: { ...defaultEdgeData } },
        { id: 'e2', source: 'node-1', target: 'node-2', data: { ...defaultEdgeData } },
        { id: 'e3', source: 'node-2', target: 'end', data: { ...defaultEdgeData } },
        {
          id: 'e-loop',
          source: 'node-2',
          target: 'node-1',
          data: { ...defaultEdgeData, maxIterations: undefined },
        },
      ];

      const workflow = createWorkflow([startNode, phase1, phase2, endNode], edges, {
        name: 'test-workflow',
        description: 'Test',
        author: 'test',
      });

      const md = generateSkillMd(workflow);
      // Generator should output "up to 3 times maximum" when maxIterations is undefined
      expect(md).toContain('up to 3 times');
    });
  });

  // ===========================
  // Section 5.4: Decision Edge Cases
  // ===========================
  describe('5.4 decision edge cases', () => {
    // Note: The current implementation only checks approval options, not decision branches
    // The decision branch check is a spec requirement not yet implemented

    it('warns when approval has less than 2 options (implemented for approval)', () => {
      const { nodes, edges } = createBasicWorkflow();

      // Replace phase with approval having only 1 option
      nodes[1] = {
        id: 'node-1',
        type: 'approval',
        position: { x: 0, y: 100 },
        data: {
          ...defaultApprovalNodeData('node-1'),
          label: 'Single Option Approval',
          options: [{ label: 'Yes', description: 'Only option' }],
        },
      } as WorkflowNode;

      const workflow = createWorkflow(nodes, edges, { name: 'test', author: 'test' });
      const warnings = validateWorkflow(workflow);

      expect(warnings.some((w) => w.includes('at least 2 options'))).toBe(true);
    });

    // TODO: Not implemented - decision with 1 branch warning
    it.skip('warns when decision has only 1 branch', () => {
      const { nodes, edges } = createBasicWorkflow();

      // Replace phase with decision having only 1 branch
      nodes[1] = {
        id: 'node-1',
        type: 'decision',
        position: { x: 0, y: 100 },
        data: {
          ...defaultDecisionNodeData('node-1'),
          label: 'Single Branch Decision',
          branches: [{ id: 'branch-1', label: 'Only Option', condition: 'Always true' }],
        },
      } as WorkflowNode;

      const workflow = createWorkflow(nodes, edges, { name: 'test', author: 'test' });
      const warnings = validateWorkflow(workflow);

      expect(warnings.some((w) => w.includes('at least 2 branches'))).toBe(true);
    });

    // TODO: Not implemented - decision with 5+ branches warning/cap
    it.skip('warns or caps when decision has 5 or more branches', () => {
      const { nodes, edges } = createBasicWorkflow();

      // Replace phase with decision having 5 branches
      nodes[1] = {
        id: 'node-1',
        type: 'decision',
        position: { x: 0, y: 100 },
        data: {
          ...defaultDecisionNodeData('node-1'),
          label: 'Many Branch Decision',
          branches: [
            { id: 'branch-1', label: 'A', condition: 'Condition A' },
            { id: 'branch-2', label: 'B', condition: 'Condition B' },
            { id: 'branch-3', label: 'C', condition: 'Condition C' },
            { id: 'branch-4', label: 'D', condition: 'Condition D' },
            { id: 'branch-5', label: 'E', condition: 'Condition E' },
          ],
        },
      } as WorkflowNode;

      const workflow = createWorkflow(nodes, edges, { name: 'test', author: 'test' });
      const warnings = validateWorkflow(workflow);

      // Should either warn or cap at 4 branches
      expect(
        warnings.some((w) => w.includes('branches') && (w.includes('maximum') || w.includes('cap')))
      ).toBe(true);
    });

    it('allows two branches pointing to the same target', () => {
      const startNode: WorkflowNode = {
        id: 'start',
        type: 'start',
        position: { x: 0, y: 0 },
        data: { id: 'start', label: 'Start' },
        deletable: false,
      };
      const decisionNode: WorkflowNode = {
        id: 'node-decision',
        type: 'decision',
        position: { x: 0, y: 100 },
        data: {
          ...defaultDecisionNodeData('node-decision'),
          label: 'Converging Decision',
          branches: [
            { id: 'branch-1', label: 'Path A', condition: 'Condition A' },
            { id: 'branch-2', label: 'Path B', condition: 'Condition B' },
          ],
        },
      };
      const phase1: WorkflowNode = {
        id: 'node-1',
        type: 'phase',
        position: { x: 0, y: 200 },
        data: { ...defaultPhaseNodeData('node-1'), label: 'Common Phase', description: 'Both paths lead here' },
      };
      const endNode: WorkflowNode = {
        id: 'end',
        type: 'end',
        position: { x: 0, y: 300 },
        data: { id: 'end', label: 'End' },
        deletable: false,
      };

      // Both decision branches point to the same target
      const edges: WorkflowEdge[] = [
        { id: 'e1', source: 'start', target: 'node-decision', data: { ...defaultEdgeData } },
        {
          id: 'e2',
          source: 'node-decision',
          sourceHandle: 'branch-1',
          target: 'node-1',
          data: { ...defaultEdgeData },
        },
        {
          id: 'e3',
          source: 'node-decision',
          sourceHandle: 'branch-2',
          target: 'node-1',
          data: { ...defaultEdgeData },
        },
        { id: 'e4', source: 'node-1', target: 'end', data: { ...defaultEdgeData } },
      ];

      const workflow = createWorkflow([startNode, decisionNode, phase1, endNode], edges, {
        name: 'test',
        description: 'Valid converging paths',
        author: 'test',
      });
      const warnings = validateWorkflow(workflow);

      // This should be valid - no warning about same target
      expect(warnings.some((w) => w.includes('same target'))).toBe(false);
      // And the path should be valid
      expect(warnings.some((w) => w.includes('No path from Start to End'))).toBe(false);
    });
  });

  // ===========================
  // Section 5.5: Metadata Edge Cases
  // ===========================
  describe('5.5 metadata edge cases', () => {
    it('warns when name is empty (default)', () => {
      const { nodes, edges } = createBasicWorkflow();
      const workflow = createWorkflow(nodes, edges, { name: 'my-workflow', author: 'test' });
      const warnings = validateWorkflow(workflow);

      expect(warnings.some((w) => w.includes('name') && w.includes('not set'))).toBe(true);
    });

    it('warns when description is default', () => {
      const { nodes, edges } = createBasicWorkflow();
      const workflow = createWorkflow(nodes, edges, {
        name: 'custom-name',
        description: 'A custom workflow created with Cake Workflow Builder',
        author: 'test',
      });
      const warnings = validateWorkflow(workflow);

      expect(warnings.some((w) => w.includes('Description') && w.includes('default'))).toBe(true);
    });

    it('warns when author is not set', () => {
      const { nodes, edges } = createBasicWorkflow();
      const workflow = createWorkflow(nodes, edges, {
        name: 'custom-name',
        description: 'Custom description',
        author: '',
      });
      const warnings = validateWorkflow(workflow);

      expect(warnings.some((w) => w.includes('Author not set'))).toBe(true);
    });

    it('no metadata warnings when all fields are properly set', () => {
      const { nodes, edges } = createBasicWorkflow();
      const workflow = createWorkflow(nodes, edges, {
        name: 'custom-name',
        description: 'A meaningful description of this workflow',
        author: 'John Doe',
      });
      const warnings = validateWorkflow(workflow);

      expect(warnings.some((w) => w.includes('name'))).toBe(false);
      expect(warnings.some((w) => w.includes('Description'))).toBe(false);
      expect(warnings.some((w) => w.includes('Author'))).toBe(false);
    });

    it('preserves name with special characters in parser', () => {
      const md = `---
name: my-workflow-v2.0_beta
description: Test workflow
author: John Doe
---

### Phase 1: Research

Do research.
`;
      const result = parseSkillMd(md);
      expect(result.metadata.name).toBe('my-workflow-v2.0_beta');
    });

    it('handles empty tags array in parser', () => {
      const md = `---
name: test-workflow
description: Test workflow
tags:
author: John Doe
---

### Phase 1: Research

Do research.
`;
      const result = parseSkillMd(md);
      // Parser regex requires at least one tag item to match
      // Empty tags: section won't match, so defaults are used
      // This behavior is acceptable - empty tags: in source => default tags in result
      expect(result.metadata.tags).toBeDefined();
      // The result should not cause warnings about invalid tags
      expect(result.warnings.some((w) => w.includes('tags'))).toBe(false);
    });

    it('preserves tags in valid format', () => {
      const md = `---
name: test-workflow
description: Test workflow
tags:
  - automation
  - testing
  - workflow
author: John Doe
---

### Phase 1: Research

Do research.
`;
      const result = parseSkillMd(md);
      expect(result.metadata.tags).toContain('automation');
      expect(result.metadata.tags).toContain('testing');
      expect(result.metadata.tags).toContain('workflow');
    });
  });

  // ===========================
  // Phase-specific warnings
  // ===========================
  describe('phase node warnings', () => {
    it('warns when phase has no description or prompt', () => {
      const startNode: WorkflowNode = {
        id: 'start',
        type: 'start',
        position: { x: 0, y: 0 },
        data: { id: 'start', label: 'Start' },
        deletable: false,
      };
      const emptyPhase: WorkflowNode = {
        id: 'node-1',
        type: 'phase',
        position: { x: 0, y: 100 },
        data: {
          ...defaultPhaseNodeData('node-1'),
          label: 'Empty Phase',
          description: '',
          agent: { ...defaultPhaseNodeData('node-1').agent, prompt: '' },
        },
      };
      const endNode: WorkflowNode = {
        id: 'end',
        type: 'end',
        position: { x: 0, y: 200 },
        data: { id: 'end', label: 'End' },
        deletable: false,
      };

      const edges: WorkflowEdge[] = [
        { id: 'e1', source: 'start', target: 'node-1', data: { ...defaultEdgeData } },
        { id: 'e2', source: 'node-1', target: 'end', data: { ...defaultEdgeData } },
      ];

      const workflow = createWorkflow([startNode, emptyPhase, endNode], edges, {
        name: 'test',
        author: 'test',
      });
      const warnings = validateWorkflow(workflow);

      expect(warnings.some((w) => w.includes('Empty Phase') && w.includes('no description'))).toBe(true);
    });

    it('warns when phase uses agent but has no prompt', () => {
      const startNode: WorkflowNode = {
        id: 'start',
        type: 'start',
        position: { x: 0, y: 0 },
        data: { id: 'start', label: 'Start' },
        deletable: false,
      };
      const noPromptPhase: WorkflowNode = {
        id: 'node-1',
        type: 'phase',
        position: { x: 0, y: 100 },
        data: {
          ...defaultPhaseNodeData('node-1'),
          label: 'No Prompt Phase',
          description: 'Has description',
          agent: { type: 'Explore', model: 'sonnet', prompt: '' },
        },
      };
      const endNode: WorkflowNode = {
        id: 'end',
        type: 'end',
        position: { x: 0, y: 200 },
        data: { id: 'end', label: 'End' },
        deletable: false,
      };

      const edges: WorkflowEdge[] = [
        { id: 'e1', source: 'start', target: 'node-1', data: { ...defaultEdgeData } },
        { id: 'e2', source: 'node-1', target: 'end', data: { ...defaultEdgeData } },
      ];

      const workflow = createWorkflow([startNode, noPromptPhase, endNode], edges, {
        name: 'test',
        author: 'test',
      });
      const warnings = validateWorkflow(workflow);

      expect(warnings.some((w) => w.includes('No Prompt Phase') && w.includes('no prompt'))).toBe(true);
    });
  });

  // ===========================
  // Approval-specific warnings
  // ===========================
  describe('approval node warnings', () => {
    it('warns when approval has no question', () => {
      const startNode: WorkflowNode = {
        id: 'start',
        type: 'start',
        position: { x: 0, y: 0 },
        data: { id: 'start', label: 'Start' },
        deletable: false,
      };
      const noQuestionApproval: WorkflowNode = {
        id: 'node-1',
        type: 'approval',
        position: { x: 0, y: 100 },
        data: {
          ...defaultApprovalNodeData('node-1'),
          label: 'No Question Approval',
          question: '',
        },
      };
      const endNode: WorkflowNode = {
        id: 'end',
        type: 'end',
        position: { x: 0, y: 200 },
        data: { id: 'end', label: 'End' },
        deletable: false,
      };

      const edges: WorkflowEdge[] = [
        { id: 'e1', source: 'start', target: 'node-1', data: { ...defaultEdgeData } },
        { id: 'e2', source: 'node-1', target: 'end', data: { ...defaultEdgeData } },
      ];

      const workflow = createWorkflow([startNode, noQuestionApproval, endNode], edges, {
        name: 'test',
        author: 'test',
      });
      const warnings = validateWorkflow(workflow);

      expect(warnings.some((w) => w.includes('No Question Approval') && w.includes('no question'))).toBe(
        true
      );
    });
  });
});
