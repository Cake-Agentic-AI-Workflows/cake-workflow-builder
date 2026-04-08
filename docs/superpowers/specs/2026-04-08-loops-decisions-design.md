# Loops and Decision Blocks Design Spec

**Date:** 2026-04-08  
**Status:** Draft  

## Overview

Extend the Cake Workflow Builder to support loops (with max iterations) and decision blocks (multi-way branching). The MD importer will detect these constructs via natural language patterns.

## Requirements

1. **Loop-back edges** — Edges that connect a later node back to an earlier one, with configurable max iterations
2. **Decision nodes** — Nodes with 2-4 output branches, each with a condition label
3. **Drag-and-drop edge reassignment** — Easily move edge endpoints to different nodes
4. **MD importer support** — Parse natural language patterns to reconstruct loops and decisions

## Design Approach

**Edge-centric model** — Edges become first-class citizens with types and metadata. Nodes define what to do; edges define where to go.

---

## Data Model

### Edge Types

```typescript
type EdgeType = 'normal' | 'loop-back';

interface WorkflowEdgeData {
  maxIterations?: number;  // for loop-back edges
  condition?: string;      // for edges from decision nodes
}

interface WorkflowEdge extends Edge {
  type: EdgeType;
  data?: WorkflowEdgeData;
}
```

### Decision Node

```typescript
interface DecisionBranch {
  id: string;
  label: string;      // e.g., "User approves", "Tests pass"
  condition: string;  // natural language or simple expression
}

interface DecisionNodeData {
  id: string;
  label: string;
  description: string;
  branches: DecisionBranch[];
}
```

- Decision nodes have 1 input handle (top) and 2-4 output handles (bottom)
- Output handles are dynamically rendered based on `branches` array
- Each branch has a unique ID referenced by edges via `sourceHandle`

### Updated Store Types

```typescript
export type DecisionNode = Node<DecisionNodeData, 'decision'>;
export type WorkflowNode = PhaseNode | ApprovalNode | DecisionNode | StartNode | EndNode;
```

---

## UI/UX

### Edge Interactions

- Enable React Flow's `edgesUpdatable` prop for drag-and-drop edge reassignment
- Loop-back edges styled distinctly:
  - Dashed stroke
  - Orange/amber color
  - Curved path (bezier going upward)
- Click edge to select → ConfigPanel shows edge settings
- Edge config panel contains:
  - Edge type selector (normal / loop-back)
  - Max iterations input (for loop-back)
  - Condition label (for edges from decision nodes)
  - Delete button
- Delete edge via backspace/delete key when selected

### Decision Node UI

- Distinct visual shape (diamond or hexagon) to differentiate from phase rectangles
- Multiple output handles arranged horizontally at bottom
- Each handle labeled with branch name
- Config panel allows:
  - Edit node label and description
  - Add/remove branches (min 2, max 4)
  - Edit branch label and condition for each
  - Reorder branches via drag handles

### Node Palette Updates

- Add "Decision" to the draggable sidebar
- Organize palette:
  - **Execution**: Phase, Approval
  - **Flow Control**: Decision

### Selection Behavior

- Clicking an edge selects it and shows edge config in the right panel
- Clicking a node selects it and shows node config
- ConfigPanel detects selection type and renders appropriate form

---

## MD Generator

### Loop-back Edge Output

When a loop-back edge exists from Phase N to Phase M:

```markdown
### Phase 2: Validate Results

[phase content...]

**On failure:** Repeat from Phase 1 (max 3 iterations)
```

The "On failure" prefix comes from the edge's `condition` label if set. Default is "On failure" for loop-backs.

### Decision Node Output

```markdown
### Decision: Review Outcome

Evaluate the results and branch:
- **If tests pass:** Continue to Phase 3
- **If tests fail:** Go to Phase 2
- **If unclear:** Go to Approval Gate
```

Each bullet maps to a branch. The target is determined by following the edge from that branch's output handle.

---

## MD Parser

### Loop Detection Patterns

Case-insensitive regex patterns:

```
/repeat\s+(?:from\s+)?(.+?)(?:\s*\(max\s*(\d+)\s*iterations?\))?/i
/go\s+back\s+to\s+(.+?)(?:\s*\(max\s*(\d+)\s*iterations?\))?/i
/retry\s+(.+?)(?:\s*(?:up\s+to|max(?:imum)?)\s*(\d+)\s*(?:times|iterations?|attempts?))?/i
/return\s+to\s+(.+?)(?:\s*\(max\s*(\d+)\s*iterations?\))?/i
```

Captured groups:
1. Target phase name
2. Max iterations (optional, default 3)

### Decision Detection Patterns

Detect a section as a decision node when:
1. Header contains "Decision" or "Branch" keywords, OR
2. Body contains 2+ lines matching the branch pattern:

```
/(?:if|when)\s+(.+?):\s*(?:go\s+to|continue\s+to|proceed\s+to)\s+(.+)/i
```

Captured groups:
1. Condition text
2. Target phase/node name

### Parser Output

- Loop phrases create a `loop-back` edge with `maxIterations` pointing to the matched phase
- Decision sections create a `decision` node with branches, plus edges to each target

### Phase Name Resolution

Parser maintains a map of phase names/labels to node IDs. Matching is:
1. Exact match first
2. Case-insensitive match
3. Partial match (target name contained in phase label)

Unresolved references generate a warning but don't fail the import.

---

## Implementation Files

### New Files
- `src/components/Nodes/DecisionNode.tsx` — Decision node component
- `src/components/ConfigPanel/DecisionConfig.tsx` — Decision node config form
- `src/components/ConfigPanel/EdgeConfig.tsx` — Edge config form

### Modified Files
- `src/types/workflow.ts` — Add DecisionNodeData, WorkflowEdgeData types
- `src/store/workflowStore.ts` — Add decision node actions, edge selection, edge updates
- `src/lib/skillGenerator.ts` — Generate loop and decision markdown
- `src/lib/skillParser.ts` — Parse loop and decision patterns
- `src/app/page.tsx` — Register decision node type, enable edge updates
- `src/components/Sidebar/NodePalette.tsx` — Add decision node to palette
- `src/components/ConfigPanel/ConfigPanel.tsx` — Route to edge/decision config

---

## Edge Cases

1. **Circular loops** — Allow but warn if a loop has no exit path
2. **Decision with no outgoing edges** — Warn during validation
3. **Multiple loop-backs to same target** — Allowed, each edge independent
4. **Orphaned decision branches** — Branches without connected edges shown as warnings
5. **Import ambiguity** — When multiple phases could match a name, prefer exact match, warn on partial

---

## Validation Updates

Add to `validateWorkflow()`:
- Loop-back edges must point backward (target comes before source in topo order)
- Decision nodes must have at least 2 branches
- Decision branches should have outgoing edges
- Warn on potential infinite loops (loop-back with no exit condition)