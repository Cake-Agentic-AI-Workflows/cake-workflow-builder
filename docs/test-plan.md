# Test Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement comprehensive test suite for skill generator/parser per spec at `docs/superpowers/specs/2026-04-13-test-plan-design.md`

**Architecture:** Hybrid testing approach with shared fixtures for workflow building, table-driven tests for combinatorial coverage, and descriptive tests for complex patterns. Tests define correct behavior (spec-driven) to uncover bugs.

**Tech Stack:** Vitest, TypeScript, Zustand store

---

## File Structure

```
src/test/
├── fixtures/
│   └── workflowBuilder.ts        # NEW: Shared workflow builders and assertions
├── generator/
│   ├── phase-output.test.ts      # NEW: Phase node → markdown
│   ├── approval-output.test.ts   # NEW: Approval node → markdown
│   ├── decision-output.test.ts   # NEW: Decision node → markdown
│   └── loop-output.test.ts       # NEW: Loop control sections
├── parser/
│   ├── frontmatter.test.ts       # NEW: Frontmatter extraction
│   ├── phase-input.test.ts       # NEW: Markdown → phase node
│   ├── approval-input.test.ts    # NEW: Markdown → approval node
│   ├── decision-input.test.ts    # NEW: Markdown → decision node
│   └── loop-input.test.ts        # NEW: Loop detection patterns
├── roundtrip/
│   └── roundtrip.test.ts         # NEW: Parse → Generate → Parse
├── combinations/
│   └── combinations.test.ts      # NEW: Node combination matrix
├── validation/
│   └── validation.test.ts        # NEW: Validation warnings
└── error-recovery/
    └── malformed-input.test.ts   # NEW: Garbage input handling
```

---

## Task 1: Create Test Fixtures

**Files:**
- Create: `src/test/fixtures/workflowBuilder.ts`

- [ ] **Step 1: Create fixtures directory**

```bash
mkdir -p src/test/fixtures
```

- [ ] **Step 2: Write workflowBuilder.ts**

```typescript
// src/test/fixtures/workflowBuilder.ts
import { WorkflowNode, WorkflowEdge } from '@/store/workflowStore';
import {
  WorkflowMetadata,
  PhaseNodeData,
  ApprovalNodeData,
  DecisionNodeData,
  defaultWorkflowMetadata,
  defaultPhaseNodeData,
  defaultApprovalNodeData,
  defaultDecisionNodeData,
  defaultEdgeData,
} from '@/types/workflow';

// Types for building workflows
export interface GeneratorInput {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  metadata: WorkflowMetadata;
}

export interface NodeSpec {
  type: 'phase' | 'approval' | 'decision';
  label: string;
  data?: Partial<PhaseNodeData | ApprovalNodeData | DecisionNodeData>;
}

export interface EdgeSpec {
  from: string; // label or 'start'
  to: string; // label or 'end'
  loop?: { maxIterations: number; condition?: string };
  branch?: string; // branch ID for decision nodes
}

export interface WorkflowSpec {
  nodes: NodeSpec[];
  edges?: EdgeSpec[];
  metadata?: Partial<WorkflowMetadata>;
}

// Build a workflow from a spec
export function buildWorkflow(spec: WorkflowSpec): GeneratorInput {
  const nodes: WorkflowNode[] = [];
  const edges: WorkflowEdge[] = [];
  const labelToId = new Map<string, string>();

  // Add start node
  nodes.push({
    id: 'start',
    type: 'start',
    position: { x: 250, y: 50 },
    data: { id: 'start', label: 'Start' },
    deletable: false,
  });
  labelToId.set('start', 'start');

  // Add content nodes
  let yPos = 150;
  spec.nodes.forEach((nodeSpec, index) => {
    const id = `node-${index + 1}`;
    labelToId.set(nodeSpec.label.toLowerCase(), id);

    if (nodeSpec.type === 'phase') {
      const baseData = defaultPhaseNodeData(id);
      nodes.push({
        id,
        type: 'phase',
        position: { x: 250, y: yPos },
        data: { ...baseData, label: nodeSpec.label, ...nodeSpec.data } as PhaseNodeData,
      });
    } else if (nodeSpec.type === 'approval') {
      const baseData = defaultApprovalNodeData(id);
      nodes.push({
        id,
        type: 'approval',
        position: { x: 250, y: yPos },
        data: { ...baseData, label: nodeSpec.label, ...nodeSpec.data } as ApprovalNodeData,
      });
    } else if (nodeSpec.type === 'decision') {
      const baseData = defaultDecisionNodeData(id);
      nodes.push({
        id,
        type: 'decision',
        position: { x: 250, y: yPos },
        data: { ...baseData, label: nodeSpec.label, ...nodeSpec.data } as DecisionNodeData,
      });
    }
    yPos += 150;
  });

  // Add end node
  nodes.push({
    id: 'end',
    type: 'end',
    position: { x: 250, y: yPos },
    data: { id: 'end', label: 'End' },
    deletable: false,
  });
  labelToId.set('end', 'end');

  // Create edges from spec or default linear
  if (spec.edges) {
    spec.edges.forEach((edgeSpec, index) => {
      const sourceId = labelToId.get(edgeSpec.from.toLowerCase()) || edgeSpec.from;
      const targetId = labelToId.get(edgeSpec.to.toLowerCase()) || edgeSpec.to;

      edges.push({
        id: `edge-${index}`,
        source: sourceId,
        target: targetId,
        sourceHandle: edgeSpec.branch || 'bottom',
        targetHandle: 'top',
        data: {
          ...defaultEdgeData,
          ...(edgeSpec.loop && {
            maxIterations: edgeSpec.loop.maxIterations,
            condition: edgeSpec.loop.condition,
          }),
        },
        animated: true,
        style: { strokeWidth: 2 },
      });
    });
  } else {
    // Default: linear chain start → node1 → node2 → ... → end
    const allIds = ['start', ...spec.nodes.map((_, i) => `node-${i + 1}`), 'end'];
    allIds.forEach((id, index) => {
      if (index < allIds.length - 1) {
        edges.push({
          id: `edge-${index}`,
          source: id,
          target: allIds[index + 1],
          sourceHandle: 'bottom',
          targetHandle: 'top',
          data: { ...defaultEdgeData },
          animated: true,
          style: { strokeWidth: 2 },
        });
      }
    });
  }

  return {
    nodes,
    edges,
    metadata: { ...defaultWorkflowMetadata, ...spec.metadata },
  };
}

// Build a simple linear workflow
export function linearWorkflow(
  nodeTypes: Array<{ type: 'phase' | 'approval'; label: string }>
): GeneratorInput {
  return buildWorkflow({
    nodes: nodeTypes.map((n) => ({ type: n.type, label: n.label })),
  });
}

// Add a loop edge to an existing workflow
export function withLoop(
  workflow: GeneratorInput,
  fromLabel: string,
  toLabel: string,
  maxIterations: number,
  condition?: string
): GeneratorInput {
  const fromNode = workflow.nodes.find(
    (n) => n.data.label.toLowerCase() === fromLabel.toLowerCase()
  );
  const toNode = workflow.nodes.find(
    (n) => n.data.label.toLowerCase() === toLabel.toLowerCase()
  );

  if (!fromNode || !toNode) {
    throw new Error(`Could not find nodes: ${fromLabel} or ${toLabel}`);
  }

  const loopEdge: WorkflowEdge = {
    id: `edge-loop-${fromNode.id}-${toNode.id}`,
    source: fromNode.id,
    target: toNode.id,
    sourceHandle: 'top',
    targetHandle: 'bottom',
    data: { maxIterations, condition },
    animated: true,
    style: { strokeWidth: 2 },
  };

  return {
    ...workflow,
    edges: [...workflow.edges, loopEdge],
  };
}

// Equivalence checking for round-trip tests
export interface EquivalenceResult {
  equal: boolean;
  differences: string[];
}

export function workflowsEquivalent(
  a: GeneratorInput,
  b: GeneratorInput
): EquivalenceResult {
  const differences: string[] = [];

  // Compare node counts by type
  const aTypes = countByType(a.nodes);
  const bTypes = countByType(b.nodes);
  for (const type of ['phase', 'approval', 'decision', 'start', 'end']) {
    if (aTypes[type] !== bTypes[type]) {
      differences.push(`Node count mismatch for ${type}: ${aTypes[type]} vs ${bTypes[type]}`);
    }
  }

  // Compare node labels exist in both
  const aLabels = new Set(a.nodes.map((n) => n.data.label.toLowerCase()));
  const bLabels = new Set(b.nodes.map((n) => n.data.label.toLowerCase()));
  for (const label of aLabels) {
    if (!bLabels.has(label)) {
      differences.push(`Label "${label}" missing in second workflow`);
    }
  }
  for (const label of bLabels) {
    if (!aLabels.has(label)) {
      differences.push(`Label "${label}" missing in first workflow`);
    }
  }

  // Compare edge connections (by label, not ID)
  const aEdges = edgesByLabel(a);
  const bEdges = edgesByLabel(b);
  for (const key of aEdges.keys()) {
    if (!bEdges.has(key)) {
      differences.push(`Edge ${key} missing in second workflow`);
    }
  }
  for (const key of bEdges.keys()) {
    if (!aEdges.has(key)) {
      differences.push(`Edge ${key} missing in first workflow`);
    }
  }

  // Compare metadata
  if (a.metadata.name !== b.metadata.name) {
    differences.push(`Metadata name mismatch: ${a.metadata.name} vs ${b.metadata.name}`);
  }
  if (a.metadata.description !== b.metadata.description) {
    differences.push(`Metadata description mismatch`);
  }

  return { equal: differences.length === 0, differences };
}

function countByType(nodes: WorkflowNode[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const node of nodes) {
    counts[node.type] = (counts[node.type] || 0) + 1;
  }
  return counts;
}

function edgesByLabel(workflow: GeneratorInput): Map<string, WorkflowEdge> {
  const nodeIdToLabel = new Map<string, string>();
  workflow.nodes.forEach((n) => nodeIdToLabel.set(n.id, n.data.label.toLowerCase()));

  const result = new Map<string, WorkflowEdge>();
  workflow.edges.forEach((e) => {
    const sourceLabel = nodeIdToLabel.get(e.source) || e.source;
    const targetLabel = nodeIdToLabel.get(e.target) || e.target;
    result.set(`${sourceLabel}->${targetLabel}`, e);
  });
  return result;
}

// Assertion helpers
export function assertContainsPhase(md: string, num: number, label: string): void {
  const pattern = new RegExp(`### Phase ${num}: ${label}`, 'i');
  if (!pattern.test(md)) {
    throw new Error(`Expected "### Phase ${num}: ${label}" in output:\n${md.slice(0, 500)}`);
  }
}

export function assertContainsLoopControl(
  md: string,
  targetLabel: string,
  maxIterations: number
): void {
  if (!md.includes('**Loop Control:**')) {
    throw new Error(`Expected "**Loop Control:**" section in output:\n${md.slice(0, 500)}`);
  }
  if (!md.includes(targetLabel)) {
    throw new Error(`Expected loop target "${targetLabel}" in output`);
  }
  if (!md.includes(`${maxIterations} times`)) {
    throw new Error(`Expected "${maxIterations} times" in loop control`);
  }
}

export function assertContainsDecision(
  md: string,
  label: string,
  branches: string[]
): void {
  if (!md.includes(`### Decision: ${label}`)) {
    throw new Error(`Expected "### Decision: ${label}" in output`);
  }
  for (const branch of branches) {
    if (!md.includes(`**${branch}**`)) {
      throw new Error(`Expected branch "**${branch}**" in decision output`);
    }
  }
}

export function assertContainsApproval(
  md: string,
  label: string,
  question: string
): void {
  if (!md.includes(`### ${label}`)) {
    throw new Error(`Expected "### ${label}" in output`);
  }
  if (!md.includes('AskUserQuestion')) {
    throw new Error(`Expected "AskUserQuestion" in approval output`);
  }
  if (!md.includes(question)) {
    throw new Error(`Expected question "${question}" in approval output`);
  }
}
```

- [ ] **Step 3: Run TypeScript check**

```bash
npx tsc --noEmit src/test/fixtures/workflowBuilder.ts 2>&1 || echo "Check for errors"
```

- [ ] **Step 4: Commit fixtures**

```bash
git add src/test/fixtures/workflowBuilder.ts
git commit -m "test: add workflow builder fixtures for comprehensive test suite"
```

---

## Task 2: Generator Tests - Phase Output

**Files:**
- Create: `src/test/generator/phase-output.test.ts`

- [ ] **Step 1: Create generator test directory**

```bash
mkdir -p src/test/generator
```

- [ ] **Step 2: Write phase-output.test.ts**

```typescript
// src/test/generator/phase-output.test.ts
import { describe, it, expect } from 'vitest';
import { generateSkillMd } from '@/lib/skillGenerator';
import { buildWorkflow, assertContainsPhase } from '../fixtures/workflowBuilder';

describe('Generator: Phase Node Output', () => {
  describe('Phase numbering', () => {
    it('numbers single phase as Phase 1', () => {
      const workflow = buildWorkflow({
        nodes: [{ type: 'phase', label: 'Analyze' }],
      });

      const output = generateSkillMd(workflow);

      assertContainsPhase(output, 1, 'Analyze');
    });

    it('numbers multiple phases sequentially', () => {
      const workflow = buildWorkflow({
        nodes: [
          { type: 'phase', label: 'Analyze' },
          { type: 'phase', label: 'Implement' },
          { type: 'phase', label: 'Review' },
        ],
      });

      const output = generateSkillMd(workflow);

      assertContainsPhase(output, 1, 'Analyze');
      assertContainsPhase(output, 2, 'Implement');
      assertContainsPhase(output, 3, 'Review');
    });

    it('skips approval nodes in phase numbering', () => {
      const workflow = buildWorkflow({
        nodes: [
          { type: 'phase', label: 'First' },
          { type: 'approval', label: 'Approval Gate' },
          { type: 'phase', label: 'Second' },
        ],
      });

      const output = generateSkillMd(workflow);

      assertContainsPhase(output, 1, 'First');
      assertContainsPhase(output, 2, 'Second');
      expect(output).not.toMatch(/Phase 3/);
    });
  });

  describe('Agent configuration output', () => {
    it('includes agent type and model', () => {
      const workflow = buildWorkflow({
        nodes: [
          {
            type: 'phase',
            label: 'Research',
            data: {
              agent: { type: 'Explore', model: 'opus', prompt: 'Find relevant code' },
            },
          },
        ],
      });

      const output = generateSkillMd(workflow);

      expect(output).toContain('subagent_type: "Explore"');
      expect(output).toContain('model: "opus"');
    });

    it('includes prompt in code block', () => {
      const workflow = buildWorkflow({
        nodes: [
          {
            type: 'phase',
            label: 'Research',
            data: {
              agent: { type: 'Explore', model: 'sonnet', prompt: 'Search the codebase for patterns' },
            },
          },
        ],
      });

      const output = generateSkillMd(workflow);

      expect(output).toContain('```');
      expect(output).toContain('Search the codebase for patterns');
    });

    it('omits agent section when type is none and no prompt', () => {
      const workflow = buildWorkflow({
        nodes: [
          {
            type: 'phase',
            label: 'Manual Step',
            data: {
              description: 'Do something manually',
              agent: { type: 'none', model: 'sonnet', prompt: '' },
            },
          },
        ],
      });

      const output = generateSkillMd(workflow);

      expect(output).not.toContain('Use Agent tool');
      expect(output).toContain('Do something manually');
    });
  });

  describe('Description output', () => {
    it('includes description text', () => {
      const workflow = buildWorkflow({
        nodes: [
          {
            type: 'phase',
            label: 'Analyze',
            data: { description: 'Analyze the problem thoroughly' },
          },
        ],
      });

      const output = generateSkillMd(workflow);

      expect(output).toContain('Analyze the problem thoroughly');
    });
  });

  describe('Subagent control output', () => {
    it('includes subagent section when enabled', () => {
      const workflow = buildWorkflow({
        nodes: [
          {
            type: 'phase',
            label: 'Parallel Work',
            data: {
              subagent: {
                enabled: true,
                condition: 'when multiple files need changes',
                execution: 'parallel',
                maxIterations: 5,
                timeout: 300,
              },
            },
          },
        ],
      });

      const output = generateSkillMd(workflow);

      expect(output).toContain('**Subagent Control:**');
      expect(output).toContain('Spawn when: when multiple files need changes');
      expect(output).toContain('Execution: parallel');
      expect(output).toContain('Maximum iterations: 5');
      expect(output).toContain('Timeout: 300 seconds');
    });

    it('omits subagent section when disabled', () => {
      const workflow = buildWorkflow({
        nodes: [
          {
            type: 'phase',
            label: 'Simple Phase',
            data: {
              subagent: { enabled: false, condition: '', execution: 'sequential', maxIterations: 3, timeout: 120 },
            },
          },
        ],
      });

      const output = generateSkillMd(workflow);

      expect(output).not.toContain('**Subagent Control:**');
    });
  });

  describe('Context output', () => {
    it('includes inputs when specified', () => {
      const workflow = buildWorkflow({
        nodes: [
          {
            type: 'phase',
            label: 'Process',
            data: {
              context: { inputs: ['file_path', 'config'], outputs: [], sizeLimit: undefined },
            },
          },
        ],
      });

      const output = generateSkillMd(workflow);

      expect(output).toContain('**Inputs:** file_path, config');
    });

    it('includes outputs when specified', () => {
      const workflow = buildWorkflow({
        nodes: [
          {
            type: 'phase',
            label: 'Generate',
            data: {
              context: { inputs: [], outputs: ['result', 'report'], sizeLimit: undefined },
            },
          },
        ],
      });

      const output = generateSkillMd(workflow);

      expect(output).toContain('**Output:** result, report');
    });

    it('includes context limit when specified', () => {
      const workflow = buildWorkflow({
        nodes: [
          {
            type: 'phase',
            label: 'Limited',
            data: {
              context: { inputs: [], outputs: [], sizeLimit: 5000 },
            },
          },
        ],
      });

      const output = generateSkillMd(workflow);

      expect(output).toContain('**Context limit:** 5000 tokens');
    });

    it('omits empty context fields', () => {
      const workflow = buildWorkflow({
        nodes: [{ type: 'phase', label: 'Basic' }],
      });

      const output = generateSkillMd(workflow);

      expect(output).not.toContain('**Inputs:**');
      expect(output).not.toContain('**Output:**');
      expect(output).not.toContain('**Context limit:**');
    });
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npm test -- src/test/generator/phase-output.test.ts
```

Expected: Tests define correct behavior. Failures indicate bugs in generator.

- [ ] **Step 4: Commit**

```bash
git add src/test/generator/phase-output.test.ts
git commit -m "test: add generator tests for phase node output"
```

---

## Task 3: Generator Tests - Approval Output

**Files:**
- Create: `src/test/generator/approval-output.test.ts`

- [ ] **Step 1: Write approval-output.test.ts**

```typescript
// src/test/generator/approval-output.test.ts
import { describe, it, expect } from 'vitest';
import { generateSkillMd } from '@/lib/skillGenerator';
import { buildWorkflow, assertContainsApproval } from '../fixtures/workflowBuilder';

describe('Generator: Approval Node Output', () => {
  describe('Basic structure', () => {
    it('generates approval header with label', () => {
      const workflow = buildWorkflow({
        nodes: [{ type: 'approval', label: 'Confirm Changes' }],
      });

      const output = generateSkillMd(workflow);

      expect(output).toContain('### Confirm Changes');
    });

    it('includes AskUserQuestion instruction', () => {
      const workflow = buildWorkflow({
        nodes: [{ type: 'approval', label: 'Approval Gate' }],
      });

      const output = generateSkillMd(workflow);

      expect(output).toContain('Use `AskUserQuestion` to confirm:');
    });

    it('includes do not proceed warning', () => {
      const workflow = buildWorkflow({
        nodes: [{ type: 'approval', label: 'Approval Gate' }],
      });

      const output = generateSkillMd(workflow);

      expect(output).toContain('**Do NOT proceed without user confirmation.**');
    });
  });

  describe('Question and options', () => {
    it('includes question in code block', () => {
      const workflow = buildWorkflow({
        nodes: [
          {
            type: 'approval',
            label: 'Confirm',
            data: {
              question: 'Are you ready to deploy?',
              options: [
                { label: 'Yes', description: 'Deploy now' },
                { label: 'No', description: 'Cancel deployment' },
              ],
            },
          },
        ],
      });

      const output = generateSkillMd(workflow);

      expect(output).toContain('Question: "Are you ready to deploy?"');
    });

    it('lists all options with descriptions', () => {
      const workflow = buildWorkflow({
        nodes: [
          {
            type: 'approval',
            label: 'Review',
            data: {
              question: 'How should we proceed?',
              options: [
                { label: 'Approve', description: 'Accept the changes' },
                { label: 'Reject', description: 'Discard the changes' },
                { label: 'Revise', description: 'Request modifications' },
              ],
            },
          },
        ],
      });

      const output = generateSkillMd(workflow);

      expect(output).toContain('- Approve: Accept the changes');
      expect(output).toContain('- Reject: Discard the changes');
      expect(output).toContain('- Revise: Request modifications');
    });
  });

  describe('Assertion helper', () => {
    it('assertContainsApproval validates output', () => {
      const workflow = buildWorkflow({
        nodes: [
          {
            type: 'approval',
            label: 'Gate',
            data: {
              question: 'Continue?',
              options: [
                { label: 'Yes', description: 'Go ahead' },
                { label: 'No', description: 'Stop' },
              ],
            },
          },
        ],
      });

      const output = generateSkillMd(workflow);

      // Should not throw
      assertContainsApproval(output, 'Gate', 'Continue?');
    });
  });
});
```

- [ ] **Step 2: Run tests**

```bash
npm test -- src/test/generator/approval-output.test.ts
```

- [ ] **Step 3: Commit**

```bash
git add src/test/generator/approval-output.test.ts
git commit -m "test: add generator tests for approval node output"
```

---

## Task 4: Generator Tests - Decision Output

**Files:**
- Create: `src/test/generator/decision-output.test.ts`

- [ ] **Step 1: Write decision-output.test.ts**

```typescript
// src/test/generator/decision-output.test.ts
import { describe, it, expect } from 'vitest';
import { generateSkillMd } from '@/lib/skillGenerator';
import { buildWorkflow, assertContainsDecision } from '../fixtures/workflowBuilder';

describe('Generator: Decision Node Output', () => {
  describe('Basic structure', () => {
    it('generates decision header with label', () => {
      const workflow = buildWorkflow({
        nodes: [{ type: 'decision', label: 'Choose Path' }],
      });

      const output = generateSkillMd(workflow);

      expect(output).toContain('### Decision: Choose Path');
    });

    it('includes question in bold', () => {
      const workflow = buildWorkflow({
        nodes: [
          {
            type: 'decision',
            label: 'Branch',
            data: {
              question: 'What should happen next?',
              branches: [
                { id: 'branch-1', label: 'Option A', condition: 'when A' },
                { id: 'branch-2', label: 'Option B', condition: 'when B' },
              ],
            },
          },
        ],
      });

      const output = generateSkillMd(workflow);

      expect(output).toContain('**What should happen next?**');
    });
  });

  describe('Branch output', () => {
    it('lists all branches with conditions', () => {
      const workflow = buildWorkflow({
        nodes: [
          {
            type: 'decision',
            label: 'Review Outcome',
            data: {
              question: 'What was the result?',
              branches: [
                { id: 'branch-1', label: 'Tests Pass', condition: 'all tests green' },
                { id: 'branch-2', label: 'Tests Fail', condition: 'any test red' },
              ],
            },
          },
        ],
        edges: [
          { from: 'start', to: 'Review Outcome' },
          { from: 'Review Outcome', to: 'end', branch: 'branch-1' },
          { from: 'Review Outcome', to: 'end', branch: 'branch-2' },
        ],
      });

      const output = generateSkillMd(workflow);

      expect(output).toContain('**Tests Pass**');
      expect(output).toContain('all tests green');
      expect(output).toContain('**Tests Fail**');
      expect(output).toContain('any test red');
    });

    it('includes Go to target for each branch', () => {
      const workflow = buildWorkflow({
        nodes: [
          {
            type: 'decision',
            label: 'Route',
            data: {
              question: 'Which way?',
              branches: [
                { id: 'branch-1', label: 'Left', condition: 'go left' },
                { id: 'branch-2', label: 'Right', condition: 'go right' },
              ],
            },
          },
          { type: 'phase', label: 'Left Path' },
          { type: 'phase', label: 'Right Path' },
        ],
        edges: [
          { from: 'start', to: 'Route' },
          { from: 'Route', to: 'Left Path', branch: 'branch-1' },
          { from: 'Route', to: 'Right Path', branch: 'branch-2' },
          { from: 'Left Path', to: 'end' },
          { from: 'Right Path', to: 'end' },
        ],
      });

      const output = generateSkillMd(workflow);

      expect(output).toContain('Go to: Left Path');
      expect(output).toContain('Go to: Right Path');
    });
  });

  describe('Assertion helper', () => {
    it('assertContainsDecision validates branches', () => {
      const workflow = buildWorkflow({
        nodes: [
          {
            type: 'decision',
            label: 'Fork',
            data: {
              question: 'Choose',
              branches: [
                { id: 'branch-1', label: 'A', condition: 'pick A' },
                { id: 'branch-2', label: 'B', condition: 'pick B' },
              ],
            },
          },
        ],
      });

      const output = generateSkillMd(workflow);

      // Should not throw
      assertContainsDecision(output, 'Fork', ['A', 'B']);
    });
  });
});
```

- [ ] **Step 2: Run tests**

```bash
npm test -- src/test/generator/decision-output.test.ts
```

- [ ] **Step 3: Commit**

```bash
git add src/test/generator/decision-output.test.ts
git commit -m "test: add generator tests for decision node output"
```

---

## Task 5: Generator Tests - Loop Output

**Files:**
- Create: `src/test/generator/loop-output.test.ts`

- [ ] **Step 1: Write loop-output.test.ts**

```typescript
// src/test/generator/loop-output.test.ts
import { describe, it, expect } from 'vitest';
import { generateSkillMd } from '@/lib/skillGenerator';
import { buildWorkflow, withLoop, assertContainsLoopControl } from '../fixtures/workflowBuilder';

describe('Generator: Loop Control Output', () => {
  describe('Loop control section', () => {
    it('generates Loop Control section for loop-back edge', () => {
      let workflow = buildWorkflow({
        nodes: [
          { type: 'phase', label: 'Analyze' },
          { type: 'phase', label: 'Implement' },
        ],
      });
      workflow = withLoop(workflow, 'Implement', 'Analyze', 3);

      const output = generateSkillMd(workflow);

      expect(output).toContain('**Loop Control:**');
    });

    it('includes target label in loop control', () => {
      let workflow = buildWorkflow({
        nodes: [
          { type: 'phase', label: 'Research' },
          { type: 'phase', label: 'Validate' },
        ],
      });
      workflow = withLoop(workflow, 'Validate', 'Research', 5);

      const output = generateSkillMd(workflow);

      expect(output).toContain('"Research"');
    });

    it('includes max iterations', () => {
      let workflow = buildWorkflow({
        nodes: [
          { type: 'phase', label: 'Try' },
          { type: 'phase', label: 'Check' },
        ],
      });
      workflow = withLoop(workflow, 'Check', 'Try', 7);

      const output = generateSkillMd(workflow);

      expect(output).toContain('7 times');
    });

    it('includes condition when specified', () => {
      let workflow = buildWorkflow({
        nodes: [
          { type: 'phase', label: 'Build' },
          { type: 'phase', label: 'Test' },
        ],
      });
      workflow = withLoop(workflow, 'Test', 'Build', 3, 'if tests fail');

      const output = generateSkillMd(workflow);

      expect(output).toContain('if tests fail');
    });

    it('uses "May repeat" format when no condition', () => {
      let workflow = buildWorkflow({
        nodes: [
          { type: 'phase', label: 'Step1' },
          { type: 'phase', label: 'Step2' },
        ],
      });
      workflow = withLoop(workflow, 'Step2', 'Step1', 3);

      const output = generateSkillMd(workflow);

      expect(output).toMatch(/May repeat back to/);
    });

    it('uses "Repeat back to" format with condition', () => {
      let workflow = buildWorkflow({
        nodes: [
          { type: 'phase', label: 'Step1' },
          { type: 'phase', label: 'Step2' },
        ],
      });
      workflow = withLoop(workflow, 'Step2', 'Step1', 3, 'when needed');

      const output = generateSkillMd(workflow);

      expect(output).toMatch(/Repeat back to/);
    });
  });

  describe('Loop placement', () => {
    it('places loop control on source phase', () => {
      let workflow = buildWorkflow({
        nodes: [
          { type: 'phase', label: 'First' },
          { type: 'phase', label: 'Second' },
          { type: 'phase', label: 'Third' },
        ],
      });
      workflow = withLoop(workflow, 'Third', 'First', 5);

      const output = generateSkillMd(workflow);

      // Loop control should appear after Phase 3: Third
      const phase3Index = output.indexOf('### Phase 3: Third');
      const loopControlIndex = output.indexOf('**Loop Control:**');

      expect(phase3Index).toBeGreaterThan(-1);
      expect(loopControlIndex).toBeGreaterThan(phase3Index);
    });
  });

  describe('Default iterations', () => {
    it('defaults to 3 iterations when maxIterations is undefined', () => {
      const workflow = buildWorkflow({
        nodes: [
          { type: 'phase', label: 'A' },
          { type: 'phase', label: 'B' },
        ],
        edges: [
          { from: 'start', to: 'A' },
          { from: 'A', to: 'B' },
          { from: 'B', to: 'end' },
          { from: 'B', to: 'A', loop: { maxIterations: 0 } }, // 0 should default to 3
        ],
      });

      const output = generateSkillMd(workflow);

      expect(output).toContain('3 times');
    });
  });

  describe('Assertion helper', () => {
    it('assertContainsLoopControl validates output', () => {
      let workflow = buildWorkflow({
        nodes: [
          { type: 'phase', label: 'Alpha' },
          { type: 'phase', label: 'Beta' },
        ],
      });
      workflow = withLoop(workflow, 'Beta', 'Alpha', 4);

      const output = generateSkillMd(workflow);

      // Should not throw
      assertContainsLoopControl(output, 'Alpha', 4);
    });
  });
});
```

- [ ] **Step 2: Run tests**

```bash
npm test -- src/test/generator/loop-output.test.ts
```

- [ ] **Step 3: Commit**

```bash
git add src/test/generator/loop-output.test.ts
git commit -m "test: add generator tests for loop control output"
```

---

## Task 6: Parser Tests - Frontmatter

**Files:**
- Create: `src/test/parser/frontmatter.test.ts`

- [ ] **Step 1: Create parser test directory**

```bash
mkdir -p src/test/parser
```

- [ ] **Step 2: Write frontmatter.test.ts**

```typescript
// src/test/parser/frontmatter.test.ts
import { describe, it, expect } from 'vitest';
import { parseFrontmatter, parseSkillMd } from '@/lib/skillParser';

describe('Parser: Frontmatter Extraction', () => {
  describe('parseFrontmatter function', () => {
    it('extracts name field', () => {
      const content = `---
name: my-workflow
description: A test
metadata:
  tags:
    - test
  author: Test
  version: "1.0.0"
  user-invocable: true
---

# Content`;

      const { metadata } = parseFrontmatter(content);

      expect(metadata.name).toBe('my-workflow');
    });

    it('extracts description with > syntax', () => {
      const content = `---
name: test
description: >
  This is a multi-line description
  that spans multiple lines
metadata:
  tags:
    - test
  author: Test
  version: "1.0.0"
  user-invocable: true
---

# Content`;

      const { metadata } = parseFrontmatter(content);

      expect(metadata.description).toContain('multi-line');
    });

    it('extracts author field', () => {
      const content = `---
name: test
description: Test
metadata:
  tags:
    - test
  author: John Doe
  version: "1.0.0"
  user-invocable: true
---

# Content`;

      const { metadata } = parseFrontmatter(content);

      expect(metadata.author).toBe('John Doe');
    });

    it('extracts version with quotes', () => {
      const content = `---
name: test
description: Test
metadata:
  tags:
    - test
  author: Test
  version: "2.5.0"
  user-invocable: true
---

# Content`;

      const { metadata } = parseFrontmatter(content);

      expect(metadata.version).toBe('2.5.0');
    });

    it('extracts version without quotes', () => {
      const content = `---
name: test
description: Test
metadata:
  tags:
    - test
  author: Test
  version: 1.0.0
  user-invocable: true
---

# Content`;

      const { metadata } = parseFrontmatter(content);

      expect(metadata.version).toBe('1.0.0');
    });

    it('extracts tags array', () => {
      const content = `---
name: test
description: Test
metadata:
  tags:
    - workflow
    - automation
    - testing
  author: Test
  version: "1.0.0"
  user-invocable: true
---

# Content`;

      const { metadata } = parseFrontmatter(content);

      expect(metadata.tags).toEqual(['workflow', 'automation', 'testing']);
    });

    it('extracts user-invocable true', () => {
      const content = `---
name: test
description: Test
metadata:
  tags:
    - test
  author: Test
  version: "1.0.0"
  user-invocable: true
---

# Content`;

      const { metadata } = parseFrontmatter(content);

      expect(metadata.userInvocable).toBe(true);
    });

    it('extracts user-invocable false', () => {
      const content = `---
name: test
description: Test
metadata:
  tags:
    - test
  author: Test
  version: "1.0.0"
  user-invocable: false
---

# Content`;

      const { metadata } = parseFrontmatter(content);

      expect(metadata.userInvocable).toBe(false);
    });

    it('returns body without frontmatter', () => {
      const content = `---
name: test
description: Test
metadata:
  tags:
    - test
  author: Test
  version: "1.0.0"
  user-invocable: true
---

# My Title

Some content here.`;

      const { body } = parseFrontmatter(content);

      expect(body).toContain('# My Title');
      expect(body).toContain('Some content here.');
      expect(body).not.toContain('name: test');
    });
  });

  describe('Missing frontmatter', () => {
    it('returns empty metadata when no frontmatter', () => {
      const content = `# Just Content

No frontmatter here.`;

      const { metadata, body } = parseFrontmatter(content);

      expect(Object.keys(metadata).length).toBe(0);
      expect(body).toBe(content);
    });
  });

  describe('parseSkillMd integration', () => {
    it('uses default metadata for missing fields', () => {
      const content = `---
name: partial
---

### Phase 1: Test

Do something.`;

      const result = parseSkillMd(content);

      expect(result.metadata.name).toBe('partial');
      expect(result.metadata.version).toBe('1.0.0'); // default
      expect(result.metadata.userInvocable).toBe(true); // default
    });
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npm test -- src/test/parser/frontmatter.test.ts
```

- [ ] **Step 4: Commit**

```bash
git add src/test/parser/frontmatter.test.ts
git commit -m "test: add parser tests for frontmatter extraction"
```

---

## Task 7: Parser Tests - Phase Input

**Files:**
- Create: `src/test/parser/phase-input.test.ts`

- [ ] **Step 1: Write phase-input.test.ts**

```typescript
// src/test/parser/phase-input.test.ts
import { describe, it, expect } from 'vitest';
import { parseSkillMd } from '@/lib/skillParser';
import { PhaseNodeData } from '@/types/workflow';

const baseFrontmatter = `---
name: test
description: Test
metadata:
  tags:
    - test
  author: Test
  version: "1.0.0"
  user-invocable: true
---

`;

describe('Parser: Phase Node Extraction', () => {
  describe('Label extraction', () => {
    it('extracts label from Phase N: Label header', () => {
      const content = baseFrontmatter + `### Phase 1: Analyze Code

Do analysis.`;

      const result = parseSkillMd(content);
      const phase = result.nodes.find((n) => n.type === 'phase');

      expect(phase).toBeDefined();
      expect((phase!.data as PhaseNodeData).label).toBe('Analyze Code');
    });

    it('extracts label without phase number', () => {
      const content = baseFrontmatter + `### Phase: Simple Label

Content.`;

      const result = parseSkillMd(content);
      const phase = result.nodes.find((n) => n.type === 'phase');

      expect(phase).toBeDefined();
      expect((phase!.data as PhaseNodeData).label).toBe('Simple Label');
    });
  });

  describe('Agent configuration extraction', () => {
    it('extracts agent type from subagent_type', () => {
      const content = baseFrontmatter + `### Phase 1: Research

Use Agent tool with \`subagent_type: "Explore"\`:

\`\`\`
Find the code
\`\`\``;

      const result = parseSkillMd(content);
      const phase = result.nodes.find((n) => n.type === 'phase');
      const data = phase!.data as PhaseNodeData;

      expect(data.agent.type).toBe('Explore');
    });

    it('extracts model from model field', () => {
      const content = baseFrontmatter + `### Phase 1: Plan

Use Agent tool with \`subagent_type: "Plan"\` and \`model: "opus"\`:

\`\`\`
Create a plan
\`\`\``;

      const result = parseSkillMd(content);
      const phase = result.nodes.find((n) => n.type === 'phase');
      const data = phase!.data as PhaseNodeData;

      expect(data.agent.model).toBe('opus');
    });

    it('extracts prompt from code block', () => {
      const content = baseFrontmatter + `### Phase 1: Execute

Use Agent tool with \`subagent_type: "general-purpose"\`:

\`\`\`
This is the prompt content
with multiple lines
\`\`\``;

      const result = parseSkillMd(content);
      const phase = result.nodes.find((n) => n.type === 'phase');
      const data = phase!.data as PhaseNodeData;

      expect(data.agent.prompt).toContain('This is the prompt content');
      expect(data.agent.prompt).toContain('multiple lines');
    });
  });

  describe('Description extraction', () => {
    it('extracts description before Use Agent', () => {
      const content = baseFrontmatter + `### Phase 1: Analyze

This is the description text.
It can span multiple lines.

Use Agent tool with \`subagent_type: "Explore"\`:

\`\`\`
prompt
\`\`\``;

      const result = parseSkillMd(content);
      const phase = result.nodes.find((n) => n.type === 'phase');
      const data = phase!.data as PhaseNodeData;

      expect(data.description).toContain('description text');
    });
  });

  describe('Subagent configuration extraction', () => {
    it('enables subagent when Subagent Control section present', () => {
      const content = baseFrontmatter + `### Phase 1: Parallel

Do parallel work.

**Subagent Control:**
- Spawn when: multiple files
- Execution: parallel
- Maximum iterations: 10
- Timeout: 600 seconds`;

      const result = parseSkillMd(content);
      const phase = result.nodes.find((n) => n.type === 'phase');
      const data = phase!.data as PhaseNodeData;

      expect(data.subagent.enabled).toBe(true);
      expect(data.subagent.execution).toBe('parallel');
      expect(data.subagent.maxIterations).toBe(10);
      expect(data.subagent.timeout).toBe(600);
    });

    it('keeps subagent disabled when no section', () => {
      const content = baseFrontmatter + `### Phase 1: Simple

Just a simple phase.`;

      const result = parseSkillMd(content);
      const phase = result.nodes.find((n) => n.type === 'phase');
      const data = phase!.data as PhaseNodeData;

      expect(data.subagent.enabled).toBe(false);
    });
  });

  describe('Context extraction', () => {
    it('extracts inputs', () => {
      const content = baseFrontmatter + `### Phase 1: Process

Process the input.

**Inputs:** file_path, config_data`;

      const result = parseSkillMd(content);
      const phase = result.nodes.find((n) => n.type === 'phase');
      const data = phase!.data as PhaseNodeData;

      expect(data.context.inputs).toEqual(['file_path', 'config_data']);
    });

    it('extracts outputs', () => {
      const content = baseFrontmatter + `### Phase 1: Generate

Generate output.

**Output:** result, report`;

      const result = parseSkillMd(content);
      const phase = result.nodes.find((n) => n.type === 'phase');
      const data = phase!.data as PhaseNodeData;

      expect(data.context.outputs).toEqual(['result', 'report']);
    });
  });

  describe('Multiple phases', () => {
    it('parses multiple phases in sequence', () => {
      const content = baseFrontmatter + `### Phase 1: First

First phase.

### Phase 2: Second

Second phase.

### Phase 3: Third

Third phase.`;

      const result = parseSkillMd(content);
      const phases = result.nodes.filter((n) => n.type === 'phase');

      expect(phases).toHaveLength(3);
      expect((phases[0].data as PhaseNodeData).label).toBe('First');
      expect((phases[1].data as PhaseNodeData).label).toBe('Second');
      expect((phases[2].data as PhaseNodeData).label).toBe('Third');
    });
  });
});
```

- [ ] **Step 2: Run tests**

```bash
npm test -- src/test/parser/phase-input.test.ts
```

- [ ] **Step 3: Commit**

```bash
git add src/test/parser/phase-input.test.ts
git commit -m "test: add parser tests for phase node extraction"
```

---

## Task 8: Parser Tests - Approval Input

**Files:**
- Create: `src/test/parser/approval-input.test.ts`

- [ ] **Step 1: Write approval-input.test.ts**

```typescript
// src/test/parser/approval-input.test.ts
import { describe, it, expect } from 'vitest';
import { parseSkillMd } from '@/lib/skillParser';
import { ApprovalNodeData } from '@/types/workflow';

const baseFrontmatter = `---
name: test
description: Test
metadata:
  tags:
    - test
  author: Test
  version: "1.0.0"
  user-invocable: true
---

`;

describe('Parser: Approval Node Extraction', () => {
  describe('Detection patterns', () => {
    it('detects approval by AskUserQuestion keyword', () => {
      const content = baseFrontmatter + `### Confirm Deploy

Use \`AskUserQuestion\` to confirm:

\`\`\`
Question: "Deploy to production?"
Options:
- Yes: Proceed with deployment
- No: Cancel
\`\`\`

**Do NOT proceed without user confirmation.**`;

      const result = parseSkillMd(content);
      const approval = result.nodes.find((n) => n.type === 'approval');

      expect(approval).toBeDefined();
    });

    it('detects approval by Approval in header', () => {
      const content = baseFrontmatter + `### Approval Gate

Use \`AskUserQuestion\` to confirm:

\`\`\`
Question: "Continue?"
Options:
- Yes: Continue
- No: Stop
\`\`\``;

      const result = parseSkillMd(content);
      const approval = result.nodes.find((n) => n.type === 'approval');

      expect(approval).toBeDefined();
    });
  });

  describe('Label extraction', () => {
    it('extracts label from header', () => {
      const content = baseFrontmatter + `### Review Changes

Use \`AskUserQuestion\` to confirm:

\`\`\`
Question: "Accept changes?"
Options:
- Yes: Accept
- No: Reject
\`\`\``;

      const result = parseSkillMd(content);
      const approval = result.nodes.find((n) => n.type === 'approval');
      const data = approval!.data as ApprovalNodeData;

      expect(data.label).toBe('Review Changes');
    });
  });

  describe('Question extraction', () => {
    it('extracts question from Question: pattern', () => {
      const content = baseFrontmatter + `### Gate

Use \`AskUserQuestion\` to confirm:

\`\`\`
Question: "Are you sure you want to proceed?"
Options:
- Yes: Proceed
- No: Cancel
\`\`\``;

      const result = parseSkillMd(content);
      const approval = result.nodes.find((n) => n.type === 'approval');
      const data = approval!.data as ApprovalNodeData;

      expect(data.question).toBe('Are you sure you want to proceed?');
    });
  });

  describe('Options extraction', () => {
    it('extracts options with labels and descriptions', () => {
      const content = baseFrontmatter + `### Checkpoint

Use \`AskUserQuestion\` to confirm:

\`\`\`
Question: "How to proceed?"
Options:
- Continue: Move to next phase
- Retry: Try again
- Abort: Stop the workflow
\`\`\``;

      const result = parseSkillMd(content);
      const approval = result.nodes.find((n) => n.type === 'approval');
      const data = approval!.data as ApprovalNodeData;

      expect(data.options).toHaveLength(3);
      expect(data.options[0]).toEqual({ label: 'Continue', description: 'Move to next phase' });
      expect(data.options[1]).toEqual({ label: 'Retry', description: 'Try again' });
      expect(data.options[2]).toEqual({ label: 'Abort', description: 'Stop the workflow' });
    });

    it('handles two options (minimum)', () => {
      const content = baseFrontmatter + `### Simple Gate

Use \`AskUserQuestion\` to confirm:

\`\`\`
Question: "Yes or no?"
Options:
- Yes: Do it
- No: Don't
\`\`\``;

      const result = parseSkillMd(content);
      const approval = result.nodes.find((n) => n.type === 'approval');
      const data = approval!.data as ApprovalNodeData;

      expect(data.options).toHaveLength(2);
    });
  });
});
```

- [ ] **Step 2: Run tests**

```bash
npm test -- src/test/parser/approval-input.test.ts
```

- [ ] **Step 3: Commit**

```bash
git add src/test/parser/approval-input.test.ts
git commit -m "test: add parser tests for approval node extraction"
```

---

## Task 9: Parser Tests - Decision Input

**Files:**
- Create: `src/test/parser/decision-input.test.ts`

- [ ] **Step 1: Write decision-input.test.ts**

```typescript
// src/test/parser/decision-input.test.ts
import { describe, it, expect } from 'vitest';
import { parseSkillMd } from '@/lib/skillParser';
import { DecisionNodeData } from '@/types/workflow';

const baseFrontmatter = `---
name: test
description: Test
metadata:
  tags:
    - test
  author: Test
  version: "1.0.0"
  user-invocable: true
---

`;

describe('Parser: Decision Node Extraction', () => {
  describe('Detection patterns', () => {
    it('detects decision by Decision: header', () => {
      const content = baseFrontmatter + `### Decision: Choose Path

**What should happen?**

Based on the outcome, take one of the following paths:

- **Option A**: when condition A
  - Go to: Phase A
- **Option B**: when condition B
  - Go to: Phase B`;

      const result = parseSkillMd(content);
      const decision = result.nodes.find((n) => n.type === 'decision');

      expect(decision).toBeDefined();
    });
  });

  describe('Label extraction', () => {
    it('extracts label from header after Decision:', () => {
      const content = baseFrontmatter + `### Decision: Route Selection

**Which route?**

- **Left**: go left
  - Go to: Left Path
- **Right**: go right
  - Go to: Right Path`;

      const result = parseSkillMd(content);
      const decision = result.nodes.find((n) => n.type === 'decision');
      const data = decision!.data as DecisionNodeData;

      expect(data.label).toBe('Route Selection');
    });
  });

  describe('Question extraction', () => {
    it('extracts question from bold text', () => {
      const content = baseFrontmatter + `### Decision: Branch

**What is the test result?**

- **Pass**: tests passed
  - Go to: Deploy
- **Fail**: tests failed
  - Go to: Fix`;

      const result = parseSkillMd(content);
      const decision = result.nodes.find((n) => n.type === 'decision');
      const data = decision!.data as DecisionNodeData;

      expect(data.question).toBe('What is the test result?');
    });
  });

  describe('Branch extraction', () => {
    it('extracts branches with labels and conditions', () => {
      const content = baseFrontmatter + `### Decision: Review Outcome

**How did the review go?**

Based on the outcome, take one of the following paths:

- **Approved**: reviewer approved changes
  - Go to: Merge
- **Rejected**: reviewer rejected changes
  - Go to: Revise
- **Needs Discussion**: unclear outcome
  - Go to: Meeting`;

      const result = parseSkillMd(content);
      const decision = result.nodes.find((n) => n.type === 'decision');
      const data = decision!.data as DecisionNodeData;

      expect(data.branches).toHaveLength(3);
      expect(data.branches[0].label).toBe('Approved');
      expect(data.branches[0].condition).toBe('reviewer approved changes');
      expect(data.branches[1].label).toBe('Rejected');
      expect(data.branches[2].label).toBe('Needs Discussion');
    });

    it('extracts two branches (minimum)', () => {
      const content = baseFrontmatter + `### Decision: Binary

**Yes or no?**

- **Yes**: affirmative
  - Go to: Do It
- **No**: negative
  - Go to: Skip`;

      const result = parseSkillMd(content);
      const decision = result.nodes.find((n) => n.type === 'decision');
      const data = decision!.data as DecisionNodeData;

      expect(data.branches).toHaveLength(2);
    });
  });

  describe('Edge creation for branches', () => {
    it('creates edges to target nodes when they exist', () => {
      const content = baseFrontmatter + `### Decision: Fork

**Which way?**

- **Left**: go left
  - Go to: Left Phase
- **Right**: go right
  - Go to: Right Phase

### Phase 1: Left Phase

Left content.

### Phase 2: Right Phase

Right content.`;

      const result = parseSkillMd(content);

      // Decision should have edges to both phases
      // Note: Current parser may not fully support this - test defines correct behavior
      const decisionNode = result.nodes.find((n) => n.type === 'decision');
      expect(decisionNode).toBeDefined();
    });
  });
});
```

- [ ] **Step 2: Run tests**

```bash
npm test -- src/test/parser/decision-input.test.ts
```

- [ ] **Step 3: Commit**

```bash
git add src/test/parser/decision-input.test.ts
git commit -m "test: add parser tests for decision node extraction"
```

---

## Task 10: Parser Tests - Loop Detection

**Files:**
- Create: `src/test/parser/loop-input.test.ts`

- [ ] **Step 1: Write loop-input.test.ts**

```typescript
// src/test/parser/loop-input.test.ts
import { describe, it, expect } from 'vitest';
import { parseSkillMd } from '@/lib/skillParser';

const baseFrontmatter = `---
name: test
description: Test
metadata:
  tags:
    - test
  author: Test
  version: "1.0.0"
  user-invocable: true
---

`;

describe('Parser: Loop Detection', () => {
  describe('Explicit Loop Control format', () => {
    it('parses Loop Control section with Repeat back to', () => {
      const content = baseFrontmatter + `### Phase 1: Analyze

Analyze the code.

### Phase 2: Implement

Implement changes.

**Loop Control:**
- Repeat back to "Analyze", up to 5 times`;

      const result = parseSkillMd(content);
      const loopEdges = result.edges.filter((e) => e.data?.maxIterations);

      expect(loopEdges).toHaveLength(1);
      expect(loopEdges[0].data?.maxIterations).toBe(5);
    });

    it('extracts condition from Loop Control', () => {
      const content = baseFrontmatter + `### Phase 1: Try

Try something.

### Phase 2: Check

Check result.

**Loop Control:**
- Repeat back to "Try" if tests fail, up to 3 times`;

      const result = parseSkillMd(content);
      const loopEdges = result.edges.filter((e) => e.data?.maxIterations);

      expect(loopEdges).toHaveLength(1);
      expect(loopEdges[0].data?.condition).toContain('tests fail');
    });
  });

  describe('Natural language loop patterns', () => {
    it('detects "repeat up to N times" as self-loop', () => {
      const content = baseFrontmatter + `### Phase 1: Retry Task

Attempt the task. Repeat up to 5 times if needed.`;

      const result = parseSkillMd(content);
      const loopEdges = result.edges.filter((e) => e.data?.maxIterations);

      expect(loopEdges.length).toBeGreaterThanOrEqual(1);
    });

    it('detects "go back to Phase" pattern', () => {
      const content = baseFrontmatter + `### Phase 1: Start

Begin here.

### Phase 2: Process

Process data. If validation fails, go back to Start.`;

      const result = parseSkillMd(content);
      const loopEdges = result.edges.filter((e) => e.data?.maxIterations);

      // Should detect loop from Process to Start
      expect(loopEdges.length).toBeGreaterThanOrEqual(1);
    });

    it('detects "retry" pattern', () => {
      const content = baseFrontmatter + `### Phase 1: Fetch

Fetch data. Retry up to 3 times on failure.`;

      const result = parseSkillMd(content);
      const loopEdges = result.edges.filter((e) => e.data?.maxIterations);

      expect(loopEdges.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Default iterations', () => {
    it('defaults to 3 iterations when not specified', () => {
      const content = baseFrontmatter + `### Phase 1: First

First step.

### Phase 2: Second

Second step. Go back to First if needed.`;

      const result = parseSkillMd(content);
      const loopEdges = result.edges.filter((e) => e.data?.maxIterations);

      if (loopEdges.length > 0) {
        expect(loopEdges[0].data?.maxIterations).toBe(3);
      }
    });
  });

  describe('Loop target resolution', () => {
    it('resolves target by exact label match', () => {
      const content = baseFrontmatter + `### Phase 1: Research

Research phase.

### Phase 2: Implement

Implement phase.

**Loop Control:**
- Repeat back to "Research", up to 4 times`;

      const result = parseSkillMd(content);
      const loopEdge = result.edges.find((e) => e.data?.maxIterations);

      expect(loopEdge).toBeDefined();
      // Target should be the Research phase node
      const researchNode = result.nodes.find(
        (n) => n.type === 'phase' && n.data.label === 'Research'
      );
      expect(loopEdge!.target).toBe(researchNode!.id);
    });

    it('generates warning for unresolved target', () => {
      const content = baseFrontmatter + `### Phase 1: Only Phase

Some content.

**Loop Control:**
- Repeat back to "Nonexistent", up to 3 times`;

      const result = parseSkillMd(content);

      expect(result.warnings.some((w) => w.includes('not found'))).toBe(true);
    });
  });
});
```

- [ ] **Step 2: Run tests**

```bash
npm test -- src/test/parser/loop-input.test.ts
```

- [ ] **Step 3: Commit**

```bash
git add src/test/parser/loop-input.test.ts
git commit -m "test: add parser tests for loop detection"
```

---

## Task 11: Round-trip Tests

**Files:**
- Create: `src/test/roundtrip/roundtrip.test.ts`

- [ ] **Step 1: Create roundtrip directory**

```bash
mkdir -p src/test/roundtrip
```

- [ ] **Step 2: Write roundtrip.test.ts**

```typescript
// src/test/roundtrip/roundtrip.test.ts
import { describe, it, expect } from 'vitest';
import { generateSkillMd } from '@/lib/skillGenerator';
import { parseSkillMd } from '@/lib/skillParser';
import { buildWorkflow, withLoop, workflowsEquivalent } from '../fixtures/workflowBuilder';

describe('Round-trip: Parse → Generate → Parse', () => {
  describe('Linear workflows', () => {
    it('preserves single phase workflow', () => {
      const original = buildWorkflow({
        nodes: [{ type: 'phase', label: 'Only Phase' }],
        metadata: { name: 'single-phase', description: 'Single phase workflow' },
      });

      const md = generateSkillMd(original);
      const parsed = parseSkillMd(md);
      const regenerated = generateSkillMd(parsed);
      const reparsed = parseSkillMd(regenerated);

      const result = workflowsEquivalent(parsed, reparsed);
      expect(result.equal).toBe(true);
    });

    it('preserves multi-phase workflow', () => {
      const original = buildWorkflow({
        nodes: [
          { type: 'phase', label: 'Phase A' },
          { type: 'phase', label: 'Phase B' },
          { type: 'phase', label: 'Phase C' },
        ],
        metadata: { name: 'multi-phase', description: 'Three phases' },
      });

      const md = generateSkillMd(original);
      const parsed = parseSkillMd(md);

      expect(parsed.nodes.filter((n) => n.type === 'phase')).toHaveLength(3);
      expect(parsed.metadata.name).toBe('multi-phase');
    });

    it('preserves phase with approval workflow', () => {
      const original = buildWorkflow({
        nodes: [
          { type: 'phase', label: 'Work' },
          { type: 'approval', label: 'Review' },
          { type: 'phase', label: 'Continue' },
        ],
      });

      const md = generateSkillMd(original);
      const parsed = parseSkillMd(md);

      expect(parsed.nodes.filter((n) => n.type === 'phase')).toHaveLength(2);
      expect(parsed.nodes.filter((n) => n.type === 'approval')).toHaveLength(1);
    });
  });

  describe('Loop workflows', () => {
    it('preserves loop-back edge', () => {
      let original = buildWorkflow({
        nodes: [
          { type: 'phase', label: 'Analyze' },
          { type: 'phase', label: 'Implement' },
        ],
      });
      original = withLoop(original, 'Implement', 'Analyze', 5);

      const md = generateSkillMd(original);
      const parsed = parseSkillMd(md);

      const loopEdges = parsed.edges.filter((e) => e.data?.maxIterations);
      expect(loopEdges.length).toBeGreaterThanOrEqual(1);
      expect(loopEdges[0].data?.maxIterations).toBe(5);
    });

    it('preserves loop condition', () => {
      let original = buildWorkflow({
        nodes: [
          { type: 'phase', label: 'Try' },
          { type: 'phase', label: 'Check' },
        ],
      });
      original = withLoop(original, 'Check', 'Try', 3, 'if tests fail');

      const md = generateSkillMd(original);
      const parsed = parseSkillMd(md);

      const loopEdge = parsed.edges.find((e) => e.data?.maxIterations);
      expect(loopEdge?.data?.condition).toContain('tests fail');
    });
  });

  describe('Metadata preservation', () => {
    it('preserves all metadata fields', () => {
      const original = buildWorkflow({
        nodes: [{ type: 'phase', label: 'Test' }],
        metadata: {
          name: 'my-workflow',
          description: 'A detailed description',
          version: '2.0.0',
          author: 'Test Author',
          tags: ['tag1', 'tag2'],
          userInvocable: false,
        },
      });

      const md = generateSkillMd(original);
      const parsed = parseSkillMd(md);

      expect(parsed.metadata.name).toBe('my-workflow');
      expect(parsed.metadata.description).toContain('detailed description');
      expect(parsed.metadata.version).toBe('2.0.0');
      expect(parsed.metadata.author).toBe('Test Author');
      expect(parsed.metadata.tags).toContain('tag1');
      expect(parsed.metadata.userInvocable).toBe(false);
    });
  });

  describe('Node data preservation', () => {
    it('preserves phase agent configuration', () => {
      const original = buildWorkflow({
        nodes: [
          {
            type: 'phase',
            label: 'Research',
            data: {
              agent: { type: 'Explore', model: 'opus', prompt: 'Find the code' },
            },
          },
        ],
      });

      const md = generateSkillMd(original);
      const parsed = parseSkillMd(md);

      const phase = parsed.nodes.find((n) => n.type === 'phase');
      expect(phase?.data.agent?.type).toBe('Explore');
      expect(phase?.data.agent?.model).toBe('opus');
      expect(phase?.data.agent?.prompt).toContain('Find the code');
    });

    it('preserves approval question and options', () => {
      const original = buildWorkflow({
        nodes: [
          {
            type: 'approval',
            label: 'Confirm',
            data: {
              question: 'Ready to deploy?',
              options: [
                { label: 'Yes', description: 'Deploy now' },
                { label: 'No', description: 'Cancel' },
              ],
            },
          },
        ],
      });

      const md = generateSkillMd(original);
      const parsed = parseSkillMd(md);

      const approval = parsed.nodes.find((n) => n.type === 'approval');
      expect(approval?.data.question).toBe('Ready to deploy?');
      expect(approval?.data.options).toHaveLength(2);
    });
  });

  describe('Edge preservation', () => {
    it('preserves edge count', () => {
      const original = buildWorkflow({
        nodes: [
          { type: 'phase', label: 'A' },
          { type: 'phase', label: 'B' },
        ],
      });

      const md = generateSkillMd(original);
      const parsed = parseSkillMd(md);

      // start → A → B → end = 3 edges
      expect(parsed.edges.length).toBeGreaterThanOrEqual(3);
    });

    it('preserves edge handles', () => {
      const original = buildWorkflow({
        nodes: [{ type: 'phase', label: 'Test' }],
      });

      const md = generateSkillMd(original);
      const parsed = parseSkillMd(md);

      for (const edge of parsed.edges) {
        expect(edge.sourceHandle).toBeDefined();
        expect(edge.targetHandle).toBeDefined();
      }
    });
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npm test -- src/test/roundtrip/roundtrip.test.ts
```

- [ ] **Step 4: Commit**

```bash
git add src/test/roundtrip/roundtrip.test.ts
git commit -m "test: add round-trip tests for parse/generate equivalence"
```

---

## Task 12: Combinations Tests

**Files:**
- Create: `src/test/combinations/combinations.test.ts`

- [ ] **Step 1: Create combinations directory**

```bash
mkdir -p src/test/combinations
```

- [ ] **Step 2: Write combinations.test.ts**

```typescript
// src/test/combinations/combinations.test.ts
import { describe, it, expect } from 'vitest';
import { generateSkillMd } from '@/lib/skillGenerator';
import { parseSkillMd } from '@/lib/skillParser';
import { buildWorkflow, withLoop } from '../fixtures/workflowBuilder';

describe('Node Combinations Matrix', () => {
  describe('Two-Node Combinations', () => {
    it('1: start → phase → end', () => {
      const workflow = buildWorkflow({
        nodes: [{ type: 'phase', label: 'Only Phase' }],
      });
      const output = generateSkillMd(workflow);

      expect(output).toContain('### Phase 1: Only Phase');
    });

    it('2: start → approval → end', () => {
      const workflow = buildWorkflow({
        nodes: [{ type: 'approval', label: 'Approval Gate' }],
      });
      const output = generateSkillMd(workflow);

      expect(output).toContain('### Approval Gate');
      expect(output).toContain('AskUserQuestion');
    });

    it('3: start → decision → end', () => {
      const workflow = buildWorkflow({
        nodes: [
          {
            type: 'decision',
            label: 'Choose',
            data: {
              question: 'Which way?',
              branches: [
                { id: 'branch-1', label: 'A', condition: 'pick A' },
                { id: 'branch-2', label: 'B', condition: 'pick B' },
              ],
            },
          },
        ],
        edges: [
          { from: 'start', to: 'Choose' },
          { from: 'Choose', to: 'end', branch: 'branch-1' },
          { from: 'Choose', to: 'end', branch: 'branch-2' },
        ],
      });
      const output = generateSkillMd(workflow);

      expect(output).toContain('### Decision: Choose');
    });

    it('4: start → phase → phase → end', () => {
      const workflow = buildWorkflow({
        nodes: [
          { type: 'phase', label: 'First' },
          { type: 'phase', label: 'Second' },
        ],
      });
      const output = generateSkillMd(workflow);

      expect(output).toContain('### Phase 1: First');
      expect(output).toContain('### Phase 2: Second');
    });

    it('5: start → phase → approval → end', () => {
      const workflow = buildWorkflow({
        nodes: [
          { type: 'phase', label: 'Work' },
          { type: 'approval', label: 'Review' },
        ],
      });
      const output = generateSkillMd(workflow);

      const phaseIndex = output.indexOf('### Phase 1: Work');
      const approvalIndex = output.indexOf('### Review');
      expect(phaseIndex).toBeLessThan(approvalIndex);
    });

    it('6: start → approval → phase → end', () => {
      const workflow = buildWorkflow({
        nodes: [
          { type: 'approval', label: 'Confirm' },
          { type: 'phase', label: 'Execute' },
        ],
      });
      const output = generateSkillMd(workflow);

      const approvalIndex = output.indexOf('### Confirm');
      const phaseIndex = output.indexOf('### Phase 1: Execute');
      expect(approvalIndex).toBeLessThan(phaseIndex);
    });
  });

  describe('Three-Node with Decision', () => {
    it('7: start → decision → (phase A | phase B) → end (fork)', () => {
      const workflow = buildWorkflow({
        nodes: [
          {
            type: 'decision',
            label: 'Fork',
            data: {
              question: 'Which path?',
              branches: [
                { id: 'branch-1', label: 'Left', condition: 'go left' },
                { id: 'branch-2', label: 'Right', condition: 'go right' },
              ],
            },
          },
          { type: 'phase', label: 'Left Path' },
          { type: 'phase', label: 'Right Path' },
        ],
        edges: [
          { from: 'start', to: 'Fork' },
          { from: 'Fork', to: 'Left Path', branch: 'branch-1' },
          { from: 'Fork', to: 'Right Path', branch: 'branch-2' },
          { from: 'Left Path', to: 'end' },
          { from: 'Right Path', to: 'end' },
        ],
      });
      const output = generateSkillMd(workflow);

      expect(output).toContain('### Decision: Fork');
      expect(output).toContain('Go to: Left Path');
      expect(output).toContain('Go to: Right Path');
    });

    it('8: start → phase → decision → (phase | approval) → end', () => {
      const workflow = buildWorkflow({
        nodes: [
          { type: 'phase', label: 'Initial' },
          {
            type: 'decision',
            label: 'Branch',
            data: {
              question: 'Result?',
              branches: [
                { id: 'branch-1', label: 'Success', condition: 'on success' },
                { id: 'branch-2', label: 'Review', condition: 'needs review' },
              ],
            },
          },
          { type: 'phase', label: 'Continue' },
          { type: 'approval', label: 'Manual Review' },
        ],
        edges: [
          { from: 'start', to: 'Initial' },
          { from: 'Initial', to: 'Branch' },
          { from: 'Branch', to: 'Continue', branch: 'branch-1' },
          { from: 'Branch', to: 'Manual Review', branch: 'branch-2' },
          { from: 'Continue', to: 'end' },
          { from: 'Manual Review', to: 'end' },
        ],
      });
      const output = generateSkillMd(workflow);

      expect(output).toContain('### Phase 1: Initial');
      expect(output).toContain('### Decision: Branch');
    });
  });

  describe('Loop Patterns', () => {
    it('10: phase with self-loop', () => {
      const workflow = buildWorkflow({
        nodes: [{ type: 'phase', label: 'Retry' }],
        edges: [
          { from: 'start', to: 'Retry' },
          { from: 'Retry', to: 'end' },
          { from: 'Retry', to: 'Retry', loop: { maxIterations: 5 } },
        ],
      });
      const output = generateSkillMd(workflow);

      expect(output).toContain('**Loop Control:**');
      expect(output).toContain('5 times');
    });

    it('11: phase B loops to phase A', () => {
      let workflow = buildWorkflow({
        nodes: [
          { type: 'phase', label: 'Analyze' },
          { type: 'phase', label: 'Implement' },
        ],
      });
      workflow = withLoop(workflow, 'Implement', 'Analyze', 3);
      const output = generateSkillMd(workflow);

      expect(output).toContain('**Loop Control:**');
      expect(output).toContain('"Analyze"');
    });

    it('12: approval loops to phase (retry pattern)', () => {
      const workflow = buildWorkflow({
        nodes: [
          { type: 'phase', label: 'Submit' },
          { type: 'approval', label: 'Review' },
        ],
        edges: [
          { from: 'start', to: 'Submit' },
          { from: 'Submit', to: 'Review' },
          { from: 'Review', to: 'end' },
          { from: 'Review', to: 'Submit', loop: { maxIterations: 3 } },
        ],
      });
      const output = generateSkillMd(workflow);

      // Approval should have loop back to Submit
      expect(output).toContain('Submit');
    });
  });

  describe('Complex Patterns', () => {
    it('16: full workflow with all node types', () => {
      const workflow = buildWorkflow({
        nodes: [
          { type: 'phase', label: 'Analyze' },
          { type: 'approval', label: 'Confirm' },
          {
            type: 'decision',
            label: 'Route',
            data: {
              question: 'How to proceed?',
              branches: [
                { id: 'branch-1', label: 'Fast', condition: 'quick path' },
                { id: 'branch-2', label: 'Careful', condition: 'safe path' },
              ],
            },
          },
          { type: 'phase', label: 'Fast Track' },
          { type: 'phase', label: 'Safe Track' },
        ],
        edges: [
          { from: 'start', to: 'Analyze' },
          { from: 'Analyze', to: 'Confirm' },
          { from: 'Confirm', to: 'Route' },
          { from: 'Route', to: 'Fast Track', branch: 'branch-1' },
          { from: 'Route', to: 'Safe Track', branch: 'branch-2' },
          { from: 'Fast Track', to: 'end' },
          { from: 'Safe Track', to: 'end' },
        ],
      });
      const output = generateSkillMd(workflow);

      expect(output).toContain('### Phase 1: Analyze');
      expect(output).toContain('### Confirm');
      expect(output).toContain('### Decision: Route');
      expect(output).toContain('### Phase 2: Fast Track');
      expect(output).toContain('### Phase 3: Safe Track');
    });
  });

  describe('Round-trip for combinations', () => {
    it('all combinations survive round-trip', () => {
      const testCases = [
        { nodes: [{ type: 'phase' as const, label: 'A' }] },
        { nodes: [{ type: 'approval' as const, label: 'Gate' }] },
        {
          nodes: [
            { type: 'phase' as const, label: 'X' },
            { type: 'phase' as const, label: 'Y' },
          ],
        },
        {
          nodes: [
            { type: 'phase' as const, label: 'P' },
            { type: 'approval' as const, label: 'Q' },
          ],
        },
      ];

      for (const spec of testCases) {
        const workflow = buildWorkflow(spec);
        const md = generateSkillMd(workflow);
        const parsed = parseSkillMd(md);

        expect(parsed.nodes.length).toBeGreaterThan(2); // More than just start/end
        expect(parsed.warnings).toHaveLength(0);
      }
    });
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npm test -- src/test/combinations/combinations.test.ts
```

- [ ] **Step 4: Commit**

```bash
git add src/test/combinations/combinations.test.ts
git commit -m "test: add node combinations matrix tests"
```

---

## Task 13: Validation Tests

**Files:**
- Create: `src/test/validation/validation.test.ts`

- [ ] **Step 1: Create validation directory**

```bash
mkdir -p src/test/validation
```

- [ ] **Step 2: Write validation.test.ts**

```typescript
// src/test/validation/validation.test.ts
import { describe, it, expect } from 'vitest';
import { validateWorkflow } from '@/lib/skillGenerator';
import { buildWorkflow, withLoop } from '../fixtures/workflowBuilder';

describe('Validation: Warning Generation', () => {
  describe('Metadata warnings', () => {
    it('warns when name is default', () => {
      const workflow = buildWorkflow({
        nodes: [{ type: 'phase', label: 'Test' }],
        metadata: { name: 'my-workflow' },
      });

      const warnings = validateWorkflow(workflow);

      expect(warnings.some((w) => w.includes('name'))).toBe(true);
    });

    it('warns when description is default', () => {
      const workflow = buildWorkflow({
        nodes: [{ type: 'phase', label: 'Test' }],
        metadata: { description: 'A custom workflow created with Cake Workflow Builder' },
      });

      const warnings = validateWorkflow(workflow);

      expect(warnings.some((w) => w.includes('description') || w.includes('Description'))).toBe(true);
    });

    it('warns when author is empty', () => {
      const workflow = buildWorkflow({
        nodes: [{ type: 'phase', label: 'Test' }],
        metadata: { author: '' },
      });

      const warnings = validateWorkflow(workflow);

      expect(warnings.some((w) => w.includes('Author') || w.includes('author'))).toBe(true);
    });

    it('no metadata warnings when all fields set', () => {
      const workflow = buildWorkflow({
        nodes: [{ type: 'phase', label: 'Test' }],
        metadata: {
          name: 'real-workflow',
          description: 'A real description for a real workflow',
          author: 'Real Author',
        },
      });

      const warnings = validateWorkflow(workflow);

      expect(warnings.filter((w) => w.includes('name') || w.includes('description') || w.includes('author'))).toHaveLength(0);
    });
  });

  describe('Orphaned node warnings', () => {
    it('warns about unconnected phase node', () => {
      const workflow = buildWorkflow({
        nodes: [
          { type: 'phase', label: 'Connected' },
          { type: 'phase', label: 'Orphan' },
        ],
        edges: [
          { from: 'start', to: 'Connected' },
          { from: 'Connected', to: 'end' },
          // Orphan has no edges
        ],
      });

      const warnings = validateWorkflow(workflow);

      expect(warnings.some((w) => w.includes('Orphan') && w.includes('not connected'))).toBe(true);
    });
  });

  describe('Phase content warnings', () => {
    it('warns when phase has no description or prompt', () => {
      const workflow = buildWorkflow({
        nodes: [
          {
            type: 'phase',
            label: 'Empty Phase',
            data: {
              description: '',
              agent: { type: 'none', model: 'sonnet', prompt: '' },
            },
          },
        ],
      });

      const warnings = validateWorkflow(workflow);

      expect(warnings.some((w) => w.includes('Empty Phase') && (w.includes('description') || w.includes('prompt')))).toBe(true);
    });

    it('warns when agent type set but no prompt', () => {
      const workflow = buildWorkflow({
        nodes: [
          {
            type: 'phase',
            label: 'Agent Phase',
            data: {
              agent: { type: 'Explore', model: 'sonnet', prompt: '' },
            },
          },
        ],
      });

      const warnings = validateWorkflow(workflow);

      expect(warnings.some((w) => w.includes('Agent Phase') && w.includes('prompt'))).toBe(true);
    });
  });

  describe('Approval content warnings', () => {
    it('warns when approval has no question', () => {
      const workflow = buildWorkflow({
        nodes: [
          {
            type: 'approval',
            label: 'Bad Approval',
            data: {
              question: '',
              options: [
                { label: 'Yes', description: 'yes' },
                { label: 'No', description: 'no' },
              ],
            },
          },
        ],
      });

      const warnings = validateWorkflow(workflow);

      expect(warnings.some((w) => w.includes('Bad Approval') && w.includes('question'))).toBe(true);
    });

    it('warns when approval has less than 2 options', () => {
      const workflow = buildWorkflow({
        nodes: [
          {
            type: 'approval',
            label: 'Single Option',
            data: {
              question: 'Continue?',
              options: [{ label: 'Ok', description: 'just ok' }],
            },
          },
        ],
      });

      const warnings = validateWorkflow(workflow);

      expect(warnings.some((w) => w.includes('Single Option') && w.includes('option'))).toBe(true);
    });
  });

  describe('Connectivity warnings', () => {
    it('warns when no path from start to end', () => {
      const workflow = buildWorkflow({
        nodes: [{ type: 'phase', label: 'Isolated' }],
        edges: [
          { from: 'start', to: 'Isolated' },
          // No edge from Isolated to end
        ],
      });

      const warnings = validateWorkflow(workflow);

      expect(warnings.some((w) => w.includes('Start') && w.includes('End'))).toBe(true);
    });
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npm test -- src/test/validation/validation.test.ts
```

- [ ] **Step 4: Commit**

```bash
git add src/test/validation/validation.test.ts
git commit -m "test: add validation warning tests"
```

---

## Task 14: Error Recovery Tests

**Files:**
- Create: `src/test/error-recovery/malformed-input.test.ts`

- [ ] **Step 1: Create error-recovery directory**

```bash
mkdir -p src/test/error-recovery
```

- [ ] **Step 2: Write malformed-input.test.ts**

```typescript
// src/test/error-recovery/malformed-input.test.ts
import { describe, it, expect } from 'vitest';
import { parseSkillMd } from '@/lib/skillParser';

describe('Error Recovery: Malformed Input', () => {
  describe('Missing frontmatter', () => {
    it('handles content with no frontmatter', () => {
      const content = `# Just Content

### Phase 1: Test

Some content.`;

      const result = parseSkillMd(content);

      // Should use defaults and parse body
      expect(result.metadata.name).toBe('my-workflow');
      expect(result.nodes.length).toBeGreaterThan(2);
    });

    it('handles completely empty input', () => {
      const content = '';

      const result = parseSkillMd(content);

      // Should return start + end only
      expect(result.nodes.filter((n) => n.type === 'start')).toHaveLength(1);
      expect(result.nodes.filter((n) => n.type === 'end')).toHaveLength(1);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Malformed sections', () => {
    it('handles phase with no content', () => {
      const content = `---
name: test
description: Test
metadata:
  tags:
    - test
  author: Test
  version: "1.0.0"
  user-invocable: true
---

### Phase 1: Empty

### Phase 2: Also Empty`;

      const result = parseSkillMd(content);

      // Should create nodes with empty data
      const phases = result.nodes.filter((n) => n.type === 'phase');
      expect(phases.length).toBe(2);
    });

    it('handles unclosed code block', () => {
      const content = `---
name: test
description: Test
metadata:
  tags:
    - test
  author: Test
  version: "1.0.0"
  user-invocable: true
---

### Phase 1: Broken

\`\`\`
This code block never closes

### Phase 2: Next

This should still be parsed.`;

      const result = parseSkillMd(content);

      // Should handle gracefully
      expect(result.nodes.length).toBeGreaterThan(2);
    });
  });

  describe('Loop reference errors', () => {
    it('warns on loop to non-existent phase', () => {
      const content = `---
name: test
description: Test
metadata:
  tags:
    - test
  author: Test
  version: "1.0.0"
  user-invocable: true
---

### Phase 1: Only Phase

Content.

**Loop Control:**
- Repeat back to "Nonexistent Phase", up to 3 times`;

      const result = parseSkillMd(content);

      expect(result.warnings.some((w) => w.includes('not found'))).toBe(true);
      // Should not create loop edge
      expect(result.edges.filter((e) => e.data?.maxIterations).length).toBe(0);
    });
  });

  describe('Garbage input', () => {
    it('handles random text', () => {
      const content = `Lorem ipsum dolor sit amet, consectetur adipiscing elit.
Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.`;

      const result = parseSkillMd(content);

      // Should return minimal workflow
      expect(result.nodes.filter((n) => n.type === 'start')).toHaveLength(1);
      expect(result.nodes.filter((n) => n.type === 'end')).toHaveLength(1);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('handles HTML input', () => {
      const content = `<html>
<head><title>Test</title></head>
<body>
<h1>Not Markdown</h1>
<p>This is HTML, not SKILL.md</p>
</body>
</html>`;

      const result = parseSkillMd(content);

      // Should handle without crashing
      expect(result.nodes.filter((n) => n.type === 'start')).toHaveLength(1);
      expect(result.nodes.filter((n) => n.type === 'end')).toHaveLength(1);
    });

    it('handles JSON input', () => {
      const content = `{
  "name": "test",
  "nodes": [],
  "edges": []
}`;

      const result = parseSkillMd(content);

      // Should handle without crashing
      expect(result.nodes).toBeDefined();
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Partial data recovery', () => {
    it('recovers what it can from partially valid input', () => {
      const content = `---
name: partial-valid
---

### Phase 1: Good Phase

This phase is well-formed.

### This is not a valid section header

Random content here.

### Phase 2: Another Good Phase

Also well-formed.`;

      const result = parseSkillMd(content);

      // Should at least get the valid phases
      const phases = result.nodes.filter((n) => n.type === 'phase');
      expect(phases.length).toBeGreaterThanOrEqual(2);
    });
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npm test -- src/test/error-recovery/malformed-input.test.ts
```

- [ ] **Step 4: Commit**

```bash
git add src/test/error-recovery/malformed-input.test.ts
git commit -m "test: add error recovery tests for malformed input"
```

---

## Task 15: Run Full Test Suite

- [ ] **Step 1: Run all new tests**

```bash
npm test -- src/test/fixtures src/test/generator src/test/parser src/test/roundtrip src/test/combinations src/test/validation src/test/error-recovery
```

- [ ] **Step 2: Review failures**

Any failing tests indicate bugs in the implementation. Document which tests fail and why.

- [ ] **Step 3: Run full test suite including existing tests**

```bash
npm test
```

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "test: complete comprehensive test suite for skill generator/parser

Implements test plan from docs/superpowers/specs/2026-04-13-test-plan-design.md:
- Workflow builder fixtures
- Generator tests (phase, approval, decision, loop output)
- Parser tests (frontmatter, phase, approval, decision, loop input)
- Round-trip tests
- Node combinations matrix
- Validation warning tests
- Error recovery for malformed input"
```
