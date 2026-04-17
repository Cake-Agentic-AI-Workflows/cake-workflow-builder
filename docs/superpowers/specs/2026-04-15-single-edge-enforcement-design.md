# Design: Enforce Single Edge Between Phases & Arrow Positioning

**Issue:** [#17 - Enforce single edge between phases in each direction](https://github.com/Cake-Agentic-AI-Workflows/cake-workflow-builder/issues/17)  
**Date:** 2026-04-15  
**Status:** Approved

## Overview

Two related improvements:
1. Enforce that each phase can have at most one edge to any other specific node (per direction)
2. Move directional indicator arrows farther from node bounds to avoid overlap with edge handles

## Requirements

### Single Edge Enforcement
- A phase can have at most one edge to any other specific node
- Multiple edges from Phase A → Phase B are prevented
- Edges in opposite directions are allowed (A → B and B → A can coexist)
- Validation applies to all edge creation paths: manual drag, auto-connect, and reconnection
- Visual feedback (red flash + shake, 400ms) when duplicate is blocked

### Arrow Positioning
- Increase directional indicator offset from 24px to 32px
- Prevents overlap between indicators and edge drag handles

## Design

### 1. Store Changes (`workflowStore.ts`)

**New state:**
```typescript
highlightedEdgeId: string | null;
```

**New methods:**
```typescript
hasEdgeBetween(source: string, target: string): boolean
// Returns true if an edge exists from source → target

highlightDuplicateEdge(source: string, target: string): void
// Finds existing edge, sets highlightedEdgeId, clears after 400ms
```

**Modified `onConnect`:**
```typescript
onConnect: (connection: Connection) => {
  const currentEdges = get().edges;
  
  // Check for duplicate
  if (get().hasEdgeBetween(connection.source, connection.target)) {
    get().highlightDuplicateEdge(connection.source, connection.target);
    return;
  }
  
  // Proceed with edge creation
  set({ edges: addEdge({...}, currentEdges) });
}
```

### 2. Edge Reconnection (`WorkflowCanvas.tsx`)

**Modified `onReconnect`:**
```typescript
const onReconnect = (oldEdge: Edge, newConnection: Connection) => {
  // Skip if no actual change
  if (oldEdge.source === newConnection.source && 
      oldEdge.target === newConnection.target) {
    return;
  }
  
  // Check for duplicate (excluding the edge being moved)
  const { hasEdgeBetween, highlightDuplicateEdge } = useWorkflowStore.getState();
  if (hasEdgeBetween(newConnection.source, newConnection.target)) {
    highlightDuplicateEdge(newConnection.source, newConnection.target);
    edgeReconnectSuccessful.current = true; // Prevent edge deletion
    return;
  }
  
  // Proceed with reconnect
  edgeReconnectSuccessful.current = true;
  useWorkflowStore.setState({
    edges: reconnectEdge(oldEdge, newConnection, edges),
  });
};
```

### 3. Visual Feedback (`EditableEdge.tsx`)

**CSS Animation:**
```css
@keyframes edge-reject {
  0%, 100% { stroke: currentColor; transform: translateX(0); }
  25% { stroke: #ef4444; transform: translateX(-2px); }
  50% { stroke: #ef4444; transform: translateX(2px); }
  75% { stroke: #ef4444; transform: translateX(-2px); }
}

.edge-highlight {
  animation: edge-reject 400ms ease-in-out;
}
```

**Component changes:**
- Subscribe to `highlightedEdgeId` from store
- Apply `.edge-highlight` class when `edge.id === highlightedEdgeId`
- Animation runs on SVG path's stroke property

### 4. Arrow Positioning (`DirectionalIndicators.tsx`)

**Change offset constant:**
```typescript
const getIndicatorPosition = (direction: Direction) => {
  const offset = 32; // Changed from 24
  // ... rest unchanged
};
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/store/workflowStore.ts` | Add `highlightedEdgeId` state, `hasEdgeBetween`, `highlightDuplicateEdge`, modify `onConnect` |
| `src/components/Canvas/WorkflowCanvas.tsx` | Modify `onReconnect` to check for duplicates |
| `src/components/Canvas/CustomEdges/EditableEdge.tsx` | Add highlight animation class and CSS |
| `src/components/Canvas/DirectionalIndicators.tsx` | Change offset from 24 to 32 |

## Edge Cases

- **Same edge reconnected to same target:** No-op, not a duplicate
- **Edge being moved creates duplicate:** Block and highlight existing edge
- **DirectionalIndicators click on already-connected handle:** Already filtered out by existing `isHandleConnected` check
- **Rapid duplicate attempts:** Timer resets on each attempt

## Testing Strategy

- Unit test `hasEdgeBetween` with various edge configurations
- Integration test: attempt duplicate via `onConnect`, verify edge not added
- Integration test: attempt duplicate via `onReconnect`, verify reconnect blocked
- Manual test: visual feedback animation appears and clears

## Acceptance Criteria

1. Drawing an edge from Phase A to Phase B works the first time
2. Attempting to draw a second edge from Phase A to Phase B is prevented with visual feedback
3. Drawing an edge from Phase B to Phase A (reverse direction) still works
4. Edge reconnection that would create duplicate is blocked with visual feedback
5. Directional indicators have clear separation from edge handles (32px offset)
