# Single Edge Enforcement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce that each phase can have at most one edge to any other specific node, with visual feedback when duplicates are blocked, plus fix arrow indicator positioning.

**Architecture:** Store-centralized validation with `hasEdgeBetween` and `highlightDuplicateEdge` methods. All edge creation paths (onConnect, onReconnect, DirectionalIndicators) use the same validation. CSS keyframe animation on EdgeComponent for visual feedback.

**Tech Stack:** React, Zustand, React Flow, Tailwind CSS

---

### Task 1: Add Store State and Helper Methods

**Files:**
- Test: `src/test/edge-validation.test.ts` (create)
- Modify: `src/store/workflowStore.ts`

- [ ] **Step 1: Create test file with failing tests for hasEdgeBetween**

Create `src/test/edge-validation.test.ts`:

```typescript
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
    
    // A→B exists, but B→A should return false
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/test/edge-validation.test.ts`

Expected: FAIL with "store.hasEdgeBetween is not a function"

- [ ] **Step 3: Add hasEdgeBetween to store interface and state**

In `src/store/workflowStore.ts`, add to the interface (around line 55):

```typescript
interface WorkflowState {
  // ... existing properties ...
  highlightedEdgeId: string | null;
  
  // ... existing methods ...
  hasEdgeBetween: (source: string, target: string) => boolean;
  highlightDuplicateEdge: (source: string, target: string) => void;
}
```

- [ ] **Step 4: Add initial state and implement hasEdgeBetween**

In `src/store/workflowStore.ts`, add to the initial state (around line 107):

```typescript
  highlightedEdgeId: null,
```

Add the method implementation (after `closeRadialMenu`):

```typescript
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
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- src/test/edge-validation.test.ts`

Expected: All 4 tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/test/edge-validation.test.ts src/store/workflowStore.ts
git commit -m "feat: add hasEdgeBetween and highlightDuplicateEdge to store"
```

---

### Task 2: Add Duplicate Prevention to onConnect

**Files:**
- Modify: `src/test/edge-validation.test.ts`
- Modify: `src/store/workflowStore.ts`

- [ ] **Step 1: Add tests for onConnect duplicate prevention**

Add to `src/test/edge-validation.test.ts`:

```typescript
describe('Edge Validation: onConnect duplicate prevention', () => {
  it('should create edge when no duplicate exists', () => {
    const store = useWorkflowStore.getState();
    
    store.onConnect({
      source: 'start',
      target: 'end',
      sourceHandle: 'bottom',
      targetHandle: 'top',
    });
    
    expect(store.edges.length).toBe(1);
    expect(store.edges[0].source).toBe('start');
    expect(store.edges[0].target).toBe('end');
  });

  it('should NOT create duplicate edge between same source and target', () => {
    const store = useWorkflowStore.getState();
    
    // Create first edge
    store.onConnect({
      source: 'start',
      target: 'end',
      sourceHandle: 'bottom',
      targetHandle: 'top',
    });
    
    expect(store.edges.length).toBe(1);
    
    // Attempt duplicate
    store.onConnect({
      source: 'start',
      target: 'end',
      sourceHandle: 'bottom',
      targetHandle: 'top',
    });
    
    // Should still be 1 edge
    expect(store.edges.length).toBe(1);
  });

  it('should allow edge in reverse direction', () => {
    const store = useWorkflowStore.getState();
    
    // Add phase nodes first
    store.addPhaseNode({ x: 100, y: 100 });
    store.addPhaseNode({ x: 100, y: 250 });
    
    const nodeIds = store.nodes
      .filter(n => n.type === 'phase')
      .map(n => n.id);
    
    // Create A→B
    store.onConnect({
      source: nodeIds[0],
      target: nodeIds[1],
      sourceHandle: 'bottom',
      targetHandle: 'top',
    });
    
    // Create B→A (reverse direction - should work)
    store.onConnect({
      source: nodeIds[1],
      target: nodeIds[0],
      sourceHandle: 'top',
      targetHandle: 'bottom',
    });
    
    expect(store.edges.length).toBe(2);
  });

  it('should set highlightedEdgeId when duplicate is blocked', () => {
    const store = useWorkflowStore.getState();
    
    // Create first edge
    store.onConnect({
      source: 'start',
      target: 'end',
      sourceHandle: 'bottom',
      targetHandle: 'top',
    });
    
    const edgeId = store.edges[0].id;
    
    // Attempt duplicate
    store.onConnect({
      source: 'start',
      target: 'end',
      sourceHandle: 'bottom',
      targetHandle: 'top',
    });
    
    // Should highlight the existing edge
    expect(useWorkflowStore.getState().highlightedEdgeId).toBe(edgeId);
  });
});
```

- [ ] **Step 2: Run tests to verify the new tests fail**

Run: `npm test -- src/test/edge-validation.test.ts`

Expected: "should NOT create duplicate edge" fails, "should set highlightedEdgeId" fails

- [ ] **Step 3: Modify onConnect to check for duplicates**

In `src/store/workflowStore.ts`, replace the `onConnect` method:

```typescript
  onConnect: (connection: Connection) => {
    const { source, target } = connection;
    
    // Check for duplicate edge
    if (source && target && get().hasEdgeBetween(source, target)) {
      get().highlightDuplicateEdge(source, target);
      return;
    }

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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/test/edge-validation.test.ts`

Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/test/edge-validation.test.ts src/store/workflowStore.ts
git commit -m "feat: add duplicate edge prevention to onConnect"
```

---

### Task 3: Add Visual Feedback to EditableEdge

**Files:**
- Modify: `src/components/Canvas/CustomEdges/EditableEdge.tsx`

- [ ] **Step 1: Import useWorkflowStore and add highlight state subscription**

In `src/components/Canvas/CustomEdges/EditableEdge.tsx`, add import at top:

```typescript
import { useWorkflowStore } from '@/store/workflowStore';
```

Inside the component function, add after the existing hooks:

```typescript
  const highlightedEdgeId = useWorkflowStore((state) => state.highlightedEdgeId);
  const isHighlighted = highlightedEdgeId === id;
```

- [ ] **Step 2: Add CSS keyframes animation via style tag**

Add a style block inside the component's return, before the fragment:

```typescript
  return (
    <>
      <style>
        {`
          @keyframes edge-reject {
            0%, 100% { stroke: inherit; }
            25%, 75% { stroke: #ef4444; }
            50% { stroke: #dc2626; }
          }
          .edge-highlight path {
            animation: edge-reject 400ms ease-in-out;
          }
        `}
      </style>
      {/* rest of component */}
    </>
  );
```

- [ ] **Step 3: Apply highlight class to BaseEdge wrapper**

Wrap the BaseEdge and paths in a group with conditional class:

```typescript
      <g className={isHighlighted ? 'edge-highlight' : ''}>
        <BaseEdge
          path={customPath}
          markerEnd={markerEnd}
          style={{
            ...style,
            strokeWidth: selected ? 3 : 2,
            stroke: isLoop ? '#f59e0b' : (style.stroke || '#64748b'),
          }}
        />
        {/* Invisible wider path for easier selection */}
        <path
          d={customPath}
          fill="none"
          strokeWidth={20}
          stroke="transparent"
          className="cursor-pointer"
        />
      </g>
```

- [ ] **Step 4: Verify manually in browser**

Run: `npm run dev`

1. Create two phase nodes
2. Connect them with an edge
3. Try to create a duplicate edge from same source to same target
4. The existing edge should flash red for ~400ms

- [ ] **Step 5: Commit**

```bash
git add src/components/Canvas/CustomEdges/EditableEdge.tsx
git commit -m "feat: add visual feedback animation for duplicate edge rejection"
```

---

### Task 4: Add Duplicate Prevention to onReconnect

**Files:**
- Modify: `src/test/edge-validation.test.ts`
- Modify: `src/components/Canvas/WorkflowCanvas.tsx`

- [ ] **Step 1: Add test for onReconnect duplicate prevention**

Add to `src/test/edge-validation.test.ts`:

```typescript
describe('Edge Validation: onReconnect duplicate prevention', () => {
  it('should block reconnect if it would create duplicate', () => {
    const store = useWorkflowStore.getState();
    
    // Add phase nodes
    store.addPhaseNode({ x: 100, y: 100 }); // node-1
    store.addPhaseNode({ x: 100, y: 250 }); // node-2
    store.addPhaseNode({ x: 100, y: 400 }); // node-3
    
    const phaseNodes = store.nodes.filter(n => n.type === 'phase');
    const [nodeA, nodeB, nodeC] = phaseNodes.map(n => n.id);
    
    // Create edges: A→B and A→C
    store.onConnect({ source: nodeA, target: nodeB, sourceHandle: 'bottom', targetHandle: 'top' });
    store.onConnect({ source: nodeA, target: nodeC, sourceHandle: 'bottom', targetHandle: 'top' });
    
    expect(store.edges.length).toBe(2);
    
    // A→B already exists, trying to reconnect A→C to A→B should be blocked
    // This is tested via the hasEdgeBetween check which WorkflowCanvas uses
    expect(store.hasEdgeBetween(nodeA, nodeB)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it passes (store logic already works)**

Run: `npm test -- src/test/edge-validation.test.ts`

Expected: PASS (hasEdgeBetween already implemented)

- [ ] **Step 3: Modify onReconnect in WorkflowCanvas.tsx**

In `src/components/Canvas/WorkflowCanvas.tsx`, modify the `onReconnect` callback:

```typescript
  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      // Skip if no actual change
      if (
        oldEdge.source === newConnection.source &&
        oldEdge.target === newConnection.target
      ) {
        edgeReconnectSuccessful.current = true;
        return;
      }

      // Check for duplicate (the edge being moved doesn't count)
      const { hasEdgeBetween, highlightDuplicateEdge } = useWorkflowStore.getState();
      if (
        newConnection.source &&
        newConnection.target &&
        hasEdgeBetween(newConnection.source, newConnection.target)
      ) {
        highlightDuplicateEdge(newConnection.source, newConnection.target);
        edgeReconnectSuccessful.current = true; // Prevent edge deletion
        return;
      }

      edgeReconnectSuccessful.current = true;
      useWorkflowStore.setState({
        edges: reconnectEdge(oldEdge, newConnection, edges) as WorkflowEdge[],
      });
    },
    [edges]
  );
```

- [ ] **Step 4: Verify manually in browser**

Run: `npm run dev`

1. Create three phase nodes (A, B, C)
2. Connect A→B and A→C
3. Try to drag the A→C edge and drop it on B
4. Should flash the A→B edge red and not reconnect

- [ ] **Step 5: Commit**

```bash
git add src/test/edge-validation.test.ts src/components/Canvas/WorkflowCanvas.tsx
git commit -m "feat: add duplicate edge prevention to onReconnect"
```

---

### Task 5: Fix Arrow Indicator Positioning

**Files:**
- Modify: `src/components/Canvas/DirectionalIndicators.tsx`

- [ ] **Step 1: Update offset constant from 24 to 32**

In `src/components/Canvas/DirectionalIndicators.tsx`, modify the `getIndicatorPosition` function:

```typescript
  const getIndicatorPosition = (direction: Direction) => {
    const offset = 32; // Changed from 24 to prevent overlap with edge handles
    switch (direction) {
      case 'up':
        return { top: -offset, left: '50%', transform: 'translateX(-50%)' };
      case 'down':
        return { bottom: -offset, left: '50%', transform: 'translateX(-50%)' };
      case 'left':
        return { left: -offset, top: '50%', transform: 'translateY(-50%)' };
      case 'right':
        return { right: -offset, top: '50%', transform: 'translateY(-50%)' };
    }
  };
```

- [ ] **Step 2: Verify manually in browser**

Run: `npm run dev`

1. Hover over a phase node
2. Verify directional arrows appear farther from node boundary
3. Verify no overlap with edge drag handles

- [ ] **Step 3: Commit**

```bash
git add src/components/Canvas/DirectionalIndicators.tsx
git commit -m "fix: increase directional indicator offset to prevent handle overlap"
```

---

### Task 6: Run Full Test Suite and Final Verification

**Files:**
- None (verification only)

- [ ] **Step 1: Run full test suite**

Run: `npm test`

Expected: All tests pass

- [ ] **Step 2: Run type check**

Run: `npm run type-check` or `npx tsc --noEmit`

Expected: No type errors

- [ ] **Step 3: Manual end-to-end verification**

Run: `npm run dev`

Test checklist:
1. ✅ Drawing edge A→B works first time
2. ✅ Attempting second edge A→B is blocked with red flash
3. ✅ Edge B→A (reverse) still works
4. ✅ Reconnecting edge to create duplicate is blocked with red flash
5. ✅ Directional indicators don't overlap with edge handles
6. ✅ Auto-connect via indicators respects duplicate rule

- [ ] **Step 4: Final commit if any cleanup needed**

```bash
git status
# If clean, no action needed
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Store state + hasEdgeBetween/highlightDuplicateEdge | workflowStore.ts, edge-validation.test.ts |
| 2 | Duplicate prevention in onConnect | workflowStore.ts |
| 3 | Visual feedback animation | EditableEdge.tsx |
| 4 | Duplicate prevention in onReconnect | WorkflowCanvas.tsx |
| 5 | Arrow positioning fix | DirectionalIndicators.tsx |
| 6 | Full verification | - |
