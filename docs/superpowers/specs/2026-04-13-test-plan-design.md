# Comprehensive Test Plan for Skill Generator & Parser

**Date:** 2026-04-13  
**Status:** Draft

## Overview

Define correct behavior for the skill generator, parser, and round-trip fidelity. Tests are specification-driven (not reverse-engineered from existing code) to uncover bugs.

### Scope

- **Generator:** `generateSkillMd()` — workflow → SKILL.md
- **Parser:** `parseSkillMd()` — SKILL.md → workflow
- **Graph Utils:** `findLoopEdges()` — cycle detection
- **Validation:** `validateWorkflow()` — warning generation
- **Round-trip:** Parse → Generate → Parse equivalence

### Testing Strategy

**Hybrid approach:**
- Table-driven tests for combinatorial node coverage
- Descriptive tests for complex patterns and edge cases
- Shared fixtures for reusable workflow builders

---

## 1. Generator Correctness

The generator takes `{nodes, edges, metadata}` and outputs a SKILL.md string.

### 1.1 Frontmatter

| Field | Correct Output |
|-------|----------------|
| name | `name: {value}` |
| description | `description: >\n  {value}` (multi-line YAML) |
| tags | YAML list: `- {tag}` per line, indented |
| author | `author: {value}` |
| version | `version: "{value}"` (quoted to prevent YAML number parsing) |
| user-invocable | `user-invocable: true\|false` |

### 1.2 Node Ordering

- Nodes appear in **topological order** (respecting edge direction)
- Loop-back edges excluded from topo sort to avoid cycles
- Start/end nodes excluded from content sections

### 1.3 Phase Node Output

```markdown
### Phase {N}: {label}

{description}

Use Agent tool with `subagent_type: "{type}"` and `model: "{model}"`:

```
{prompt}
```

**Subagent Control:**
- Spawn when: {condition}
- Execution: {parallel|sequential}
- Maximum iterations: {N}
- Timeout: {N} seconds

**Inputs:** {comma-separated list}
**Output:** {comma-separated list}
**Context limit:** {N} tokens
```

- Phase number increments for each phase node
- Agent section omitted if `agent.type === 'none'` and no prompt
- Subagent section omitted if `subagent.enabled === false`
- Input/Output/Context lines omitted if empty

### 1.4 Approval Node Output

```markdown
### {label}

Use `AskUserQuestion` to confirm:

```
Question: "{question}"
Options:
- {label}: {description}
- {label}: {description}
```

**Do NOT proceed without user confirmation.**
```

### 1.5 Decision Node Output

```markdown
### Decision: {label}

**{question}**

Based on the outcome, take one of the following paths:

- **{branch.label}**: {branch.condition}
  - Go to: {targetNodeLabel}
- **{branch.label}**: {branch.condition}
  - Go to: {targetNodeLabel}
```

- Target node label resolved from edge's target node
- Each branch corresponds to an output handle

### 1.6 Loop Control Output

Loop control section appears on the **source node** of a loop-back edge:

```markdown
**Loop Control:**
- Repeat back to "{targetLabel}" {condition}, up to {maxIterations} times
```

- If no condition: `May repeat back to "{targetLabel}", up to {maxIterations} times maximum`
- Default maxIterations: 3

---

## 2. Parser Correctness

The parser takes a SKILL.md string and outputs `{nodes, edges, metadata, warnings}`.

### 2.1 Frontmatter Parsing

| Field | Pattern | Default |
|-------|---------|---------|
| name | `^name:\s*(.+)$` | `my-workflow` |
| description | `description:\s*>?\n?\s*(.+?)(?=\n[a-z]\|\nmetadata:)` | Default description |
| author | `^author:\s*(.+)$` | Empty string |
| version | `version:\s*"?([^"\n]+)"?` | `1.0.0` |
| tags | `tags:\n((?:\s+-\s*.+\n?)+)` | `['generated']` |
| user-invocable | `user-invocable:\s*(true\|false)` | `true` |

### 2.2 Section Detection

| Pattern | Node Type |
|---------|-----------|
| `###\s*Phase\s*\d*:?\s*(.+)` | phase |
| Contains `AskUserQuestion` OR `###\s*.*Approval` | approval |
| `###\s*Decision:\s*(.+)` OR natural language decision patterns | decision |

Natural language decision detection:
- `if X, go to Y` patterns
- `depending on X, proceed to Y` patterns
- `based on X, take one of the following paths` patterns

### 2.3 Phase Node Extraction

| Field | Pattern |
|-------|---------|
| label | From header after "Phase N:" |
| agent.type | `subagent_type:\s*"?([^"}\s]+)"?` |
| agent.model | `model:\s*"?([^"}\s]+)"?` |
| agent.prompt | Content of fenced code block |
| description | Text before `Use Agent` or code block |
| subagent.enabled | Presence of `**Subagent Control:**` |
| subagent.execution | `Execution:\s*(parallel\|sequential)` |
| subagent.maxIterations | `Maximum iterations:\s*(\d+)` |
| subagent.timeout | `Timeout:\s*(\d+)` |
| context.inputs | `**Inputs?:**\s*(.+)` (comma-split) |
| context.outputs | `**Output:**\s*(.+)` (comma-split) |

### 2.4 Approval Node Extraction

| Field | Pattern |
|-------|---------|
| label | From header |
| question | `Question:\s*"(.+?)"` |
| options | `-\s*([^:]+):\s*(.+)` lines after `Options:` |

### 2.5 Decision Node Extraction

| Field | Pattern |
|-------|---------|
| label | Header after "Decision:" |
| question | Bold text `\*\*([^*]+)\*\*` |
| branches | `- \*\*([^*]+)\*\*:\s*(.+)\n\s*- Go to:\s*(.+)` |

### 2.6 Loop Detection

**Explicit format:**
```
**Loop Control:**
- Repeat back to "{target}", up to {N} times
```

**Natural language patterns:**
| Pattern | Result |
|---------|--------|
| `repeat/retry/iterate (this phase)? up to N times` | Self-loop |
| `go back/return/loop back to {Phase}` | Loop to named target |
| `repeat from {Phase} (max N iterations)?` | Loop with optional count |

Default maxIterations: 3

### 2.7 Edge Generation

- Sequential edges created: start → node1 → node2 → ... → end
- All edges have `sourceHandle` and `targetHandle` set
- Source handles: `bottom` for start/phase/approval, branch ID for decision
- Target handles: `top` for all node types

### 2.8 Node Positioning

- x: 250 (centered)
- y: starts at 50 (start node), increments by 150 per content node
- End node placed after last content node

### 2.9 Warnings

| Condition | Warning Message |
|-----------|-----------------|
| Loop target not found | `Loop target "{name}" not found` |
| No phases detected | `No phases detected - the SKILL.md format may not be compatible` |
| Unresolved decision target | `Decision branch target "{name}" not found` |

---

## 3. Round-trip Fidelity

### 3.1 Preservation Requirements

**MUST preserve:**
- Node count and types
- Node labels
- Node data (agent config, prompts, options, branches)
- Edge connections (source → target relationships)
- Loop-back edge data (maxIterations, condition)
- Decision branch targets
- All metadata fields

**MAY change (acceptable variance):**
- Node IDs (parser generates new IDs)
- Node positions (layout recalculated)
- Edge IDs (derived from source/target)
- Whitespace/formatting in markdown
- Order of edges in array

### 3.2 Equivalence Definition

Two workflows are equivalent if:
1. Same number of nodes per type
2. For each node label, data fields match
3. Edge graph is isomorphic (same label→label connections)
4. Metadata fields match

---

## 4. Node Combinations Matrix

### 4.1 Two-Node Combinations

| # | Workflow | Assertions |
|---|----------|------------|
| 1 | start → phase → end | Phase numbered "Phase 1" |
| 2 | start → approval → end | Approval standalone |
| 3 | start → decision → end | Both branches connect to end |
| 4 | start → phase → phase → end | Phases numbered 1, 2 |
| 5 | start → phase → approval → end | Correct order in output |
| 6 | start → approval → phase → end | Correct order in output |

### 4.2 Three-Node with Decision

| # | Workflow | Assertions |
|---|----------|------------|
| 7 | start → decision → (phase A \| phase B) → end | Fork to different phases |
| 8 | start → phase → decision → (phase \| approval) → end | Decision after phase |
| 9 | start → decision → phase → decision → end | Chained decisions |

### 4.3 Loop Patterns

| # | Workflow | Assertions |
|---|----------|------------|
| 10 | phase with self-loop | Loop control section present |
| 11 | phase B loops to phase A | Loop targets correct label |
| 12 | approval loops to phase | Retry pattern works |
| 13 | decision branch loops back | Loop from branch |

### 4.4 Complex Patterns

| # | Workflow | Assertions |
|---|----------|------------|
| 14 | Diamond: decision → 2 phases → merge → end | Branches converge |
| 15 | Nested: decision → (decision \| phase) → end | Decision in branch |
| 16 | Full: phase → approval → decision → (phase+loop \| phase) → end | All types combined |

---

## 5. Edge Cases

### 5.1 Orphaned Nodes

| # | Case | Expected |
|---|------|----------|
| 1 | Phase with no connections | Warning: "Node X is not connected" |
| 2 | Decision with unconnected branch | Warning: "Branch X has no outgoing edge" |

### 5.2 Unreachable Paths

| # | Case | Expected |
|---|------|----------|
| 3 | Node not reachable from start | Warning about unreachable node |
| 4 | No path from start to end | Warning: "No path from Start to End" |

### 5.3 Loop Edge Cases

| # | Case | Expected |
|---|------|----------|
| 5 | Loop with no exit path | Warning: "Potential infinite loop" |
| 6 | Multiple loops to same target | Both preserved independently |
| 7 | Loop from decision branch | Loop control correct |
| 8 | maxIterations = 0 or undefined | Default to 3 in output |

### 5.4 Decision Edge Cases

| # | Case | Expected |
|---|------|----------|
| 9 | Decision with 1 branch | Warning: "needs at least 2 branches" |
| 10 | Decision with 5+ branches | Warning or cap at 4 |
| 11 | Two branches → same target | Valid, both edges created |

### 5.5 Metadata Edge Cases

| # | Case | Expected |
|---|------|----------|
| 12 | Empty name | Warning, use default |
| 13 | Name with special chars | Preserved or sanitized |
| 14 | Empty tags array | Valid, empty tags section |

---

## 6. Error Recovery (Malformed Input)

### 6.1 Frontmatter Errors

| # | Input | Expected |
|---|-------|----------|
| 15 | No frontmatter | Use defaults, parse body |
| 16 | Unclosed `---` block | Best-effort, warning |
| 17 | Invalid YAML | Skip frontmatter, warning |

### 6.2 Section Errors

| # | Input | Expected |
|---|-------|----------|
| 18 | Phase with no content | Empty description/prompt |
| 19 | Approval with no options | Default 2 options |
| 20 | Decision with bad branches | Default branches, warning |
| 21 | Unclosed code block | Capture until EOF/next section |

### 6.3 Loop Reference Errors

| # | Input | Expected |
|---|-------|----------|
| 22 | Loop to non-existent phase | Warning, no loop edge |
| 23 | Ambiguous phase name | Closest match, warning |
| 24 | No iteration count | Default to 3 |

### 6.4 Garbage Input

| # | Input | Expected |
|---|-------|----------|
| 25 | Empty string | start + end only, warning |
| 26 | Random text | start + end only, warning |
| 27 | HTML instead of markdown | Best-effort, likely start + end |

---

## 7. Test File Organization

```
src/test/
├── setup.ts                      # Existing test setup
├── fixtures/
│   └── workflowBuilder.ts        # Helper functions
├── generator/
│   ├── generator.test.ts         # Generator integration
│   ├── phase-output.test.ts      # Phase → markdown
│   ├── approval-output.test.ts   # Approval → markdown
│   ├── decision-output.test.ts   # Decision → markdown
│   └── loop-output.test.ts       # Loop control sections
├── parser/
│   ├── parser.test.ts            # Parser integration
│   ├── frontmatter.test.ts       # Frontmatter extraction
│   ├── phase-input.test.ts       # Markdown → phase
│   ├── approval-input.test.ts    # Markdown → approval
│   ├── decision-input.test.ts    # Markdown → decision
│   └── loop-input.test.ts        # Loop detection
├── roundtrip/
│   └── roundtrip.test.ts         # Parse → Generate → Parse
├── combinations/
│   └── combinations.test.ts      # Node combination matrix
├── validation/
│   └── validation.test.ts        # Validation warnings
└── error-recovery/
    └── malformed-input.test.ts   # Garbage input handling
```

---

## 8. Fixture Helpers

### workflowBuilder.ts

```typescript
// Types
interface WorkflowSpec {
  nodes: NodeSpec[];
  edges: EdgeSpec[];
  metadata?: Partial<WorkflowMetadata>;
}

interface NodeSpec {
  type: 'phase' | 'approval' | 'decision';
  label: string;
  data?: Partial<PhaseNodeData | ApprovalNodeData | DecisionNodeData>;
}

interface EdgeSpec {
  from: string;  // label or 'start'
  to: string;    // label or 'end'
  loop?: { maxIterations: number; condition?: string };
  branch?: string;  // for decision nodes
}

// Builders
function buildWorkflow(spec: WorkflowSpec): GeneratorInput;
function linearWorkflow(nodeTypes: Array<'phase' | 'approval'>): GeneratorInput;
function withLoop(
  workflow: GeneratorInput,
  fromLabel: string,
  toLabel: string,
  maxIterations: number,
  condition?: string
): GeneratorInput;
function withDecision(
  workflow: GeneratorInput,
  afterLabel: string,
  branches: Array<{ label: string; condition: string; targetLabel: string }>
): GeneratorInput;

// Equivalence
interface EquivalenceResult {
  equal: boolean;
  differences: string[];
}
function workflowsEquivalent(a: GeneratorInput, b: GeneratorInput): EquivalenceResult;

// Assertions
function assertContainsPhase(md: string, num: number, label: string): void;
function assertContainsLoopControl(md: string, targetLabel: string, maxIterations: number): void;
function assertContainsDecision(md: string, label: string, branches: string[]): void;
function assertContainsApproval(md: string, label: string, question: string): void;
```

---

## 9. Implementation Notes

### Test Independence

- Each test resets store state via `beforeEach`
- Tests do not depend on execution order
- Fixtures create fresh workflow objects

### Assertion Style

- Use specific assertions over generic `toEqual`
- Include helpful failure messages
- Test one behavior per test case

### Coverage Goals

- All node types in isolation
- All valid 2-node and 3-node combinations
- All loop patterns
- All decision patterns
- All edge cases from sections 5-6
- Round-trip for each combination
