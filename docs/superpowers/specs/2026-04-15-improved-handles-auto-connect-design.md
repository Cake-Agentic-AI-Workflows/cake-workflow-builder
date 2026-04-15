# Design: Improved Handles & Auto-Connect

**Issue:** [#5 - Improve arrow drag points and auto-connect](https://github.com/Cake-Agentic-AI-Workflows/cake-workflow-builder/issues/5)  
**Date:** 2026-04-15  
**Status:** Approved

## Overview

Enhance the workflow builder UX by making connection handles larger and adding an auto-connect feature that allows users to quickly connect to nearby nodes or spawn new nodes via a radial menu.

## Requirements

### Functional
1. Larger, more visible drag handles on all nodes
2. Directional indicators (↑ → ↓ ←) appear on node hover
3. Clicking an indicator auto-connects to the nearest node in that direction
4. If no node exists, show a radial menu to spawn a new node and connect

### Non-Functional
- Connection UX should feel snappy and intuitive
- Minimal visual clutter when not interacting

## Design

### 1. Larger Handles

Increase handle size from `w-3 h-3` (12×12px) to `w-4 h-4` (16×16px) across all node types.

**Files affected:**
- `src/components/Canvas/CustomNodes/StartNode.tsx`
- `src/components/Canvas/CustomNodes/EndNode.tsx`
- `src/components/Canvas/CustomNodes/PhaseNode.tsx`
- `src/components/Canvas/CustomNodes/ApprovalNode.tsx`
- `src/components/Canvas/CustomNodes/DecisionNode.tsx`

The existing `hover:scale-150` effect remains unchanged.

### 2. Directional Indicators

**Behavior:**
- 4 directional arrows (↑ → ↓ ←) appear around a node on hover
- Positioned outside node bounds, centered on each side
- Subtle styling: small, semi-transparent, brighten on hover
- ~150ms hover delay to avoid flicker

**Visual layout:**
```
           [↑]
            
   [←]   [  NODE  ]   [→]
            
           [↓]
```

**Visibility rules:**
- Hidden by default
- Appear on node hover
- Each indicator disabled/hidden if that direction's output handle is already connected

**Implementation:**
- New component: `DirectionalIndicators.tsx`
- Rendered as overlay positioned based on node bounds from React Flow

### 3. Auto-Connect Logic

**When clicking a directional indicator:**

1. **Find nearest node** in that direction:
   - "Right" means nodes where `targetNode.x > sourceNode.x + sourceNode.width`
   - Pick closest by Euclidean distance from source center

2. **If node found → connect:**
   - Select appropriate handles based on direction (see table below)
   - Create edge via existing `workflowStore.onConnect`

3. **If no node found → spawn flow:**
   - Only if the relevant source handle isn't already connected
   - Show radial menu (see Section 4)

**Handle selection** (Source = clicked node, Target = destination):

| Direction | Source Handle | Target Handle |
|-----------|---------------|---------------|
| ↑ (up)    | top output    | bottom input  |
| → (right) | right output  | left input    |
| ↓ (down)  | bottom output | top input     |
| ← (left)  | left output   | right input   |

**Fallback:** If preferred handle doesn't exist or is occupied, pick the next closest available handle.

**Node-specific constraints:**
- **StartNode:** Only has bottom output, can only connect outward
- **EndNode:** Only has top input, cannot initiate connections (indicators disabled)
- **DecisionNode:** Max 2 outputs (Yes/No branch handles), 1 input — disable indicators for saturated handles
- **PhaseNode/ApprovalNode:** Handles on all 4 sides, no limit

### 4. Radial Menu for Node Spawning

**Trigger:** Click a directional indicator when no node exists in that direction AND the relevant source handle isn't already connected.

**Appearance:**
- Circular menu appears near cursor
- 5 node type options arranged radially
- Each option shows icon + label

**Layout (clockwise from top):**
```
           Phase [P/1]
              ◉
     End              Approval
    [E/2]    ╳       [A/4]
              
     Start         Decision
    [S/3]           [D/5]
```

**Keyboard shortcuts:**
- Numbers: 1=Phase, 2=End, 3=Start, 4=Approval, 5=Decision
- Letters: P=Phase, E=End, S=Start, A=Approval, D=Decision
- Escape: cancel

**On selection:**
1. Create new node of selected type
2. Position 150px offset from source in the chosen direction
3. Auto-connect source → new node using handle logic
4. Select the new node for immediate editing

**Implementation:**
- New component: `RadialNodePicker.tsx`
- State in Zustand: `{ isOpen, position, sourceNodeId, direction }`
- Global keyboard listener when menu is open

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/Canvas/DirectionalIndicators.tsx` | Create |
| `src/components/Canvas/RadialNodePicker.tsx` | Create |
| `src/components/Canvas/CustomNodes/StartNode.tsx` | Modify — larger handles |
| `src/components/Canvas/CustomNodes/EndNode.tsx` | Modify — larger handles |
| `src/components/Canvas/CustomNodes/PhaseNode.tsx` | Modify — larger handles |
| `src/components/Canvas/CustomNodes/ApprovalNode.tsx` | Modify — larger handles |
| `src/components/Canvas/CustomNodes/DecisionNode.tsx` | Modify — larger handles |
| `src/store/workflowStore.ts` | Modify — add radial menu state + spawn logic |
| `src/utils/spatialUtils.ts` | Create — nearest node + handle selection utilities |

## Edge Cases

- **Multiple nodes equidistant:** Pick first found (topmost/leftmost as tiebreaker)
- **EndNode indicator click:** No-op (EndNode cannot initiate connections)
- **Click outside radial menu:** Close menu, no action
- **All handles saturated:** Hide all indicators for that node

## Testing Strategy

- Unit tests for `spatialUtils.ts`: nearest-node calculation, handle selection
- Integration tests for connection creation
- Manual testing for hover interactions, radial menu keyboard shortcuts

## Follow-up Issues

> **[ENHANCEMENT] Change node type from context menu**  
> Allow users to right-click a node and change its type (e.g., Phase → Approval) without deleting and recreating. Preserve connections where possible.

## Acceptance Criteria

1. ✅ Drag handles are visually larger (16×16px vs 12×12px)
2. ✅ Users can click a directional indicator to auto-connect to nearest node
3. ✅ If no node exists, radial menu allows spawning + connecting in one flow
4. ✅ Connection UX feels snappy and intuitive
