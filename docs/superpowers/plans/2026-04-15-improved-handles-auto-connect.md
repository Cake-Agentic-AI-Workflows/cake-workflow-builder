# Improved Handles & Auto-Connect Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance workflow builder UX with larger connection handles and auto-connect feature via directional indicators and radial node picker.

**Architecture:** Node-centric directional indicators appear on hover around nodes. Clicking an indicator either connects to the nearest node in that direction or opens a radial menu to spawn + connect a new node. Spatial utilities handle nearest-node calculation and handle selection.

**Tech Stack:** React, TypeScript, @xyflow/react v12, Zustand, Tailwind CSS, Vitest

---

## File Structure

| File | Responsibility |
|------|----------------|
| `src/utils/spatialUtils.ts` | Create — Nearest node calculation, handle selection logic |
| `src/utils/spatialUtils.test.ts` | Create — Unit tests for spatial utilities |
| `src/components/Canvas/DirectionalIndicators.tsx` | Create — Hover overlay with 4 directional arrows |
| `src/components/Canvas/RadialNodePicker.tsx` | Create — Circular menu for node type selection |
| `src/store/workflowStore.ts` | Modify — Add radial menu state, addStartNode, spawn logic |
| `src/types/workflow.ts` | Modify — Add Direction type |
| `src/components/Canvas/CustomNodes/*.tsx` | Modify — Larger handles (w-3→w-4) |
| `src/components/Canvas/WorkflowCanvas.tsx` | Modify — Integrate DirectionalIndicators + RadialNodePicker |

---

### Task 1: Add Direction Type

**Files:**
- Modify: `src/types/workflow.ts`

- [ ] **Step 1: Add Direction type to workflow types**

Add at the top of the file after existing type definitions:

```typescript
export type Direction = 'up' | 'down' | 'left' | 'right';
```

- [ ] **Step 2: Commit**

```bash
git add src/types/workflow.ts
git commit -m "feat: add Direction type for auto-connect feature"
```

---

### Task 2: Create Spatial Utilities with Tests

**Files:**
- Create: `src/utils/spatialUtils.ts`
- Create: `src/utils/spatialUtils.test.ts`

- [ ] **Step 1: Write tests for findNearestNodeInDirection**

```typescript
// src/utils/spatialUtils.test.ts
import { describe, it, expect } from 'vitest';
import { findNearestNodeInDirection, getHandlesForDirection } from './spatialUtils';
import { Node } from '@xyflow/react';

describe('findNearestNodeInDirection', () => {
  const sourceNode: Node = {
    id: 'source',
    position: { x: 100, y: 100 },
    measured: { width: 100, height: 50 },
    data: {},
  };

  const nodeToRight: Node = {
    id: 'right-node',
    position: { x: 300, y: 100 },
    measured: { width: 100, height: 50 },
    data: {},
  };

  const nodeToLeft: Node = {
    id: 'left-node',
    position: { x: -100, y: 100 },
    measured: { width: 100, height: 50 },
    data: {},
  };

  const nodeAbove: Node = {
    id: 'above-node',
    position: { x: 100, y: -50 },
    measured: { width: 100, height: 50 },
    data: {},
  };

  const nodeBelow: Node = {
    id: 'below-node',
    position: { x: 100, y: 250 },
    measured: { width: 100, height: 50 },
    data: {},
  };

  it('finds node to the right', () => {
    const nodes = [sourceNode, nodeToRight, nodeToLeft];
    const result = findNearestNodeInDirection(sourceNode, nodes, 'right');
    expect(result?.id).toBe('right-node');
  });

  it('finds node to the left', () => {
    const nodes = [sourceNode, nodeToRight, nodeToLeft];
    const result = findNearestNodeInDirection(sourceNode, nodes, 'left');
    expect(result?.id).toBe('left-node');
  });

  it('finds node above', () => {
    const nodes = [sourceNode, nodeAbove, nodeBelow];
    const result = findNearestNodeInDirection(sourceNode, nodes, 'up');
    expect(result?.id).toBe('above-node');
  });

  it('finds node below', () => {
    const nodes = [sourceNode, nodeAbove, nodeBelow];
    const result = findNearestNodeInDirection(sourceNode, nodes, 'down');
    expect(result?.id).toBe('below-node');
  });

  it('returns null when no node in direction', () => {
    const nodes = [sourceNode, nodeToRight];
    const result = findNearestNodeInDirection(sourceNode, nodes, 'left');
    expect(result).toBeNull();
  });

  it('excludes source node from results', () => {
    const nodes = [sourceNode];
    const result = findNearestNodeInDirection(sourceNode, nodes, 'right');
    expect(result).toBeNull();
  });

  it('picks closest when multiple nodes in direction', () => {
    const closerNode: Node = {
      id: 'closer',
      position: { x: 220, y: 100 },
      measured: { width: 100, height: 50 },
      data: {},
    };
    const nodes = [sourceNode, nodeToRight, closerNode];
    const result = findNearestNodeInDirection(sourceNode, nodes, 'right');
    expect(result?.id).toBe('closer');
  });
});

describe('getHandlesForDirection', () => {
  it('returns correct handles for up direction', () => {
    const result = getHandlesForDirection('up');
    expect(result).toEqual({ sourceHandle: 'top', targetHandle: 'bottom' });
  });

  it('returns correct handles for down direction', () => {
    const result = getHandlesForDirection('down');
    expect(result).toEqual({ sourceHandle: 'bottom', targetHandle: 'top' });
  });

  it('returns correct handles for left direction', () => {
    const result = getHandlesForDirection('left');
    expect(result).toEqual({ sourceHandle: 'left', targetHandle: 'right' });
  });

  it('returns correct handles for right direction', () => {
    const result = getHandlesForDirection('right');
    expect(result).toEqual({ sourceHandle: 'right', targetHandle: 'left' });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:run -- src/utils/spatialUtils.test.ts
```

Expected: FAIL with "Cannot find module './spatialUtils'"

- [ ] **Step 3: Implement spatialUtils.ts**

```typescript
// src/utils/spatialUtils.ts
import { Node } from '@xyflow/react';
import { Direction } from '@/types/workflow';

interface NodeCenter {
  x: number;
  y: number;
}

function getNodeCenter(node: Node): NodeCenter {
  const width = node.measured?.width ?? 100;
  const height = node.measured?.height ?? 50;
  return {
    x: node.position.x + width / 2,
    y: node.position.y + height / 2,
  };
}

function getNodeBounds(node: Node) {
  const width = node.measured?.width ?? 100;
  const height = node.measured?.height ?? 50;
  return {
    left: node.position.x,
    right: node.position.x + width,
    top: node.position.y,
    bottom: node.position.y + height,
  };
}

function isInDirection(source: Node, target: Node, direction: Direction): boolean {
  const sourceBounds = getNodeBounds(source);
  const targetBounds = getNodeBounds(target);

  switch (direction) {
    case 'right':
      return targetBounds.left > sourceBounds.right;
    case 'left':
      return targetBounds.right < sourceBounds.left;
    case 'up':
      return targetBounds.bottom < sourceBounds.top;
    case 'down':
      return targetBounds.top > sourceBounds.bottom;
  }
}

function getDistance(a: NodeCenter, b: NodeCenter): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function findNearestNodeInDirection(
  sourceNode: Node,
  allNodes: Node[],
  direction: Direction
): Node | null {
  const sourceCenter = getNodeCenter(sourceNode);

  const candidates = allNodes.filter(
    (node) => node.id !== sourceNode.id && isInDirection(sourceNode, node, direction)
  );

  if (candidates.length === 0) {
    return null;
  }

  let nearest = candidates[0];
  let nearestDistance = getDistance(sourceCenter, getNodeCenter(nearest));

  for (let i = 1; i < candidates.length; i++) {
    const distance = getDistance(sourceCenter, getNodeCenter(candidates[i]));
    if (distance < nearestDistance) {
      nearest = candidates[i];
      nearestDistance = distance;
    }
  }

  return nearest;
}

export function getHandlesForDirection(direction: Direction): {
  sourceHandle: string;
  targetHandle: string;
} {
  switch (direction) {
    case 'up':
      return { sourceHandle: 'top', targetHandle: 'bottom' };
    case 'down':
      return { sourceHandle: 'bottom', targetHandle: 'top' };
    case 'left':
      return { sourceHandle: 'left', targetHandle: 'right' };
    case 'right':
      return { sourceHandle: 'right', targetHandle: 'left' };
  }
}

export function getSpawnPosition(
  sourceNode: Node,
  direction: Direction,
  offset: number = 150
): { x: number; y: number } {
  const sourceCenter = getNodeCenter(sourceNode);
  const width = sourceNode.measured?.width ?? 100;
  const height = sourceNode.measured?.height ?? 50;

  switch (direction) {
    case 'up':
      return { x: sourceNode.position.x, y: sourceNode.position.y - offset - height };
    case 'down':
      return { x: sourceNode.position.x, y: sourceNode.position.y + height + offset };
    case 'left':
      return { x: sourceNode.position.x - offset - width, y: sourceNode.position.y };
    case 'right':
      return { x: sourceNode.position.x + width + offset, y: sourceNode.position.y };
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:run -- src/utils/spatialUtils.test.ts
```

Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/spatialUtils.ts src/utils/spatialUtils.test.ts
git commit -m "feat: add spatial utilities for nearest node calculation"
```

---

### Task 3: Add Radial Menu State to Store

**Files:**
- Modify: `src/store/workflowStore.ts`

- [ ] **Step 1: Add radial menu state and actions to store**

Add imports at top:

```typescript
import { Direction, NodeType } from '@/types/workflow';
```

Add to WorkflowState interface after `selectedEdgeId`:

```typescript
  radialMenu: {
    isOpen: boolean;
    position: { x: number; y: number };
    sourceNodeId: string | null;
    direction: Direction | null;
  };
  openRadialMenu: (sourceNodeId: string, direction: Direction, position: { x: number; y: number }) => void;
  closeRadialMenu: () => void;
  addStartNode: (position: { x: number; y: number }) => string;
  addEndNode: (position: { x: number; y: number }) => string;
  addNodeByType: (type: NodeType, position: { x: number; y: number }) => string;
```

Add initial state in create() call after `selectedEdgeId: null`:

```typescript
  radialMenu: {
    isOpen: false,
    position: { x: 0, y: 0 },
    sourceNodeId: null,
    direction: null,
  },
```

Add implementations after `deleteNode`:

```typescript
  openRadialMenu: (sourceNodeId, direction, position) => {
    set({
      radialMenu: {
        isOpen: true,
        position,
        sourceNodeId,
        direction,
      },
    });
  },

  closeRadialMenu: () => {
    set({
      radialMenu: {
        isOpen: false,
        position: { x: 0, y: 0 },
        sourceNodeId: null,
        direction: null,
      },
    });
  },

  addStartNode: (position) => {
    const id = generateNodeId();
    const newNode: StartNode = {
      id,
      type: 'start',
      position,
      data: { id, label: 'Start' },
    };
    set({
      nodes: [...get().nodes, newNode],
      selectedNodeId: id,
    });
    return id;
  },

  addEndNode: (position) => {
    const id = generateNodeId();
    const newNode: EndNode = {
      id,
      type: 'end',
      position,
      data: { id, label: 'End' },
    };
    set({
      nodes: [...get().nodes, newNode],
      selectedNodeId: id,
    });
    return id;
  },

  addNodeByType: (type, position) => {
    switch (type) {
      case 'start':
        return get().addStartNode(position);
      case 'end':
        return get().addEndNode(position);
      case 'phase':
        return get().addPhaseNode(position);
      case 'approval':
        return get().addApprovalNode(position);
      case 'decision':
        return get().addDecisionNode(position);
      default:
        return get().addPhaseNode(position);
    }
  },
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/store/workflowStore.ts
git commit -m "feat: add radial menu state and node spawn actions to store"
```

---

### Task 4: Enlarge Handles on All Node Types

**Files:**
- Modify: `src/components/Canvas/CustomNodes/StartNode.tsx`
- Modify: `src/components/Canvas/CustomNodes/EndNode.tsx`
- Modify: `src/components/Canvas/CustomNodes/PhaseNode.tsx`
- Modify: `src/components/Canvas/CustomNodes/ApprovalNode.tsx`
- Modify: `src/components/Canvas/CustomNodes/DecisionNode.tsx`

- [ ] **Step 1: Update StartNode handle size**

In `src/components/Canvas/CustomNodes/StartNode.tsx`, change line 18:

```typescript
// Before:
className="w-3 h-3 !bg-green-500"

// After:
className="w-4 h-4 !bg-green-500 hover:!bg-primary hover:scale-150 transition-transform"
```

- [ ] **Step 2: Update EndNode handle size**

In `src/components/Canvas/CustomNodes/EndNode.tsx`, change line 18:

```typescript
// Before:
className="w-3 h-3 !bg-red-500"

// After:
className="w-4 h-4 !bg-red-500 hover:!bg-primary hover:scale-150 transition-transform"
```

- [ ] **Step 3: Update PhaseNode handle sizes**

In `src/components/Canvas/CustomNodes/PhaseNode.tsx`, replace all `w-3 h-3` with `w-4 h-4` on lines 39, 46, 53, 59, 66, 72.

- [ ] **Step 4: Update ApprovalNode handle sizes**

In `src/components/Canvas/CustomNodes/ApprovalNode.tsx`, replace all `w-3 h-3` with `w-4 h-4` on lines 24, 31, 38, 44, 51, 57.

- [ ] **Step 5: Update DecisionNode handle sizes**

In `src/components/Canvas/CustomNodes/DecisionNode.tsx`, replace all `w-3 h-3` with `w-4 h-4` on lines 26, 32, 38, 75.

- [ ] **Step 6: Verify visually**

```bash
npm run dev
```

Open http://localhost:3000 and verify handles appear larger on all node types.

- [ ] **Step 7: Commit**

```bash
git add src/components/Canvas/CustomNodes/
git commit -m "feat: enlarge connection handles from 12px to 16px"
```

---

### Task 5: Create DirectionalIndicators Component

**Files:**
- Create: `src/components/Canvas/DirectionalIndicators.tsx`

- [ ] **Step 1: Create DirectionalIndicators component**

```typescript
// src/components/Canvas/DirectionalIndicators.tsx
'use client';

import { useCallback, useState, useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useWorkflowStore, WorkflowNode } from '@/store/workflowStore';
import { Direction } from '@/types/workflow';
import { findNearestNodeInDirection, getHandlesForDirection, getSpawnPosition } from '@/utils/spatialUtils';
import { cn } from '@/lib/utils';

interface DirectionalIndicatorsProps {
  node: WorkflowNode;
  onOpenRadialMenu: (direction: Direction, position: { x: number; y: number }) => void;
}

const directionIcons = {
  up: ChevronUp,
  down: ChevronDown,
  left: ChevronLeft,
  right: ChevronRight,
};

export function DirectionalIndicators({ node, onOpenRadialMenu }: DirectionalIndicatorsProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);
  const { getNodes } = useReactFlow();
  const { nodes, edges, onConnect } = useWorkflowStore();

  // Don't show indicators on EndNode (can't initiate connections)
  if (node.type === 'end') {
    return null;
  }

  const handleMouseEnter = useCallback(() => {
    const timeout = setTimeout(() => setIsVisible(true), 150);
    setHoverTimeout(timeout);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
    }
    setIsVisible(false);
  }, [hoverTimeout]);

  const isHandleConnected = useCallback(
    (handleId: string): boolean => {
      return edges.some(
        (edge) => edge.source === node.id && edge.sourceHandle === handleId
      );
    },
    [edges, node.id]
  );

  const handleIndicatorClick = useCallback(
    (direction: Direction, event: React.MouseEvent) => {
      event.stopPropagation();

      const { sourceHandle, targetHandle } = getHandlesForDirection(direction);

      // Check if source handle is already connected
      if (isHandleConnected(sourceHandle)) {
        return;
      }

      const allNodes = getNodes() as WorkflowNode[];
      const targetNode = findNearestNodeInDirection(node, allNodes, direction);

      if (targetNode) {
        // Connect to existing node
        onConnect({
          source: node.id,
          target: targetNode.id,
          sourceHandle,
          targetHandle,
        });
      } else {
        // Open radial menu to spawn new node
        const spawnPos = getSpawnPosition(node, direction);
        onOpenRadialMenu(direction, { x: event.clientX, y: event.clientY });
      }
    },
    [node, getNodes, onConnect, isHandleConnected, onOpenRadialMenu]
  );

  const getIndicatorPosition = (direction: Direction) => {
    const offset = 24;
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

  const directions: Direction[] = ['up', 'down', 'left', 'right'];

  // Filter out directions based on node type constraints
  const availableDirections = directions.filter((direction) => {
    const { sourceHandle } = getHandlesForDirection(direction);
    
    // StartNode only has bottom output
    if (node.type === 'start' && direction !== 'down') {
      return false;
    }

    // Check if handle is already connected
    if (isHandleConnected(sourceHandle)) {
      return false;
    }

    return true;
  });

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {isVisible &&
        availableDirections.map((direction) => {
          const Icon = directionIcons[direction];
          const position = getIndicatorPosition(direction);

          return (
            <button
              key={direction}
              className={cn(
                'absolute w-6 h-6 rounded-full',
                'bg-gray-200/80 hover:bg-primary hover:text-white',
                'flex items-center justify-center',
                'pointer-events-auto cursor-pointer',
                'transition-all duration-150',
                'shadow-sm hover:shadow-md'
              )}
              style={position}
              onClick={(e) => handleIndicatorClick(direction, e)}
            >
              <Icon className="w-4 h-4" />
            </button>
          );
        })}
    </div>
  );
}
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/components/Canvas/DirectionalIndicators.tsx
git commit -m "feat: add DirectionalIndicators component for auto-connect"
```

---

### Task 6: Create RadialNodePicker Component

**Files:**
- Create: `src/components/Canvas/RadialNodePicker.tsx`

- [ ] **Step 1: Create RadialNodePicker component**

```typescript
// src/components/Canvas/RadialNodePicker.tsx
'use client';

import { useCallback, useEffect } from 'react';
import { Play, Square, Cog, HelpCircle, GitBranch } from 'lucide-react';
import { useWorkflowStore } from '@/store/workflowStore';
import { NodeType } from '@/types/workflow';
import { getHandlesForDirection, getSpawnPosition } from '@/utils/spatialUtils';
import { cn } from '@/lib/utils';

interface NodeOption {
  type: NodeType;
  label: string;
  icon: React.ReactNode;
  shortcutNumber: string;
  shortcutLetter: string;
  angle: number; // degrees, 0 = top
}

const nodeOptions: NodeOption[] = [
  { type: 'phase', label: 'Phase', icon: <Cog className="w-5 h-5" />, shortcutNumber: '1', shortcutLetter: 'p', angle: 0 },
  { type: 'end', label: 'End', icon: <Square className="w-5 h-5" />, shortcutNumber: '2', shortcutLetter: 'e', angle: 72 },
  { type: 'start', label: 'Start', icon: <Play className="w-5 h-5" />, shortcutNumber: '3', shortcutLetter: 's', angle: 144 },
  { type: 'decision', label: 'Decision', icon: <GitBranch className="w-5 h-5" />, shortcutNumber: '5', shortcutLetter: 'd', angle: 216 },
  { type: 'approval', label: 'Approval', icon: <HelpCircle className="w-5 h-5" />, shortcutNumber: '4', shortcutLetter: 'a', angle: 288 },
];

export function RadialNodePicker() {
  const { radialMenu, closeRadialMenu, nodes, addNodeByType, onConnect } = useWorkflowStore();
  const { isOpen, position, sourceNodeId, direction } = radialMenu;

  const handleSelectNode = useCallback(
    (nodeType: NodeType) => {
      if (!sourceNodeId || !direction) return;

      const sourceNode = nodes.find((n) => n.id === sourceNodeId);
      if (!sourceNode) return;

      // Get spawn position and create node
      const spawnPos = getSpawnPosition(sourceNode, direction);
      const newNodeId = addNodeByType(nodeType, spawnPos);

      // Connect source to new node
      const { sourceHandle, targetHandle } = getHandlesForDirection(direction);
      onConnect({
        source: sourceNodeId,
        target: newNodeId,
        sourceHandle,
        targetHandle,
      });

      closeRadialMenu();
    },
    [sourceNodeId, direction, nodes, addNodeByType, onConnect, closeRadialMenu]
  );

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeRadialMenu();
        return;
      }

      const key = e.key.toLowerCase();
      const option = nodeOptions.find(
        (opt) => opt.shortcutNumber === key || opt.shortcutLetter === key
      );

      if (option) {
        handleSelectNode(option.type);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeRadialMenu, handleSelectNode]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.radial-menu')) {
        closeRadialMenu();
      }
    };

    // Delay to avoid immediate close from the trigger click
    const timeout = setTimeout(() => {
      window.addEventListener('click', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('click', handleClickOutside);
    };
  }, [isOpen, closeRadialMenu]);

  if (!isOpen) return null;

  const radius = 80;

  return (
    <div
      className="radial-menu fixed z-50"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {/* Center indicator */}
      <div className="absolute w-3 h-3 bg-primary rounded-full -translate-x-1/2 -translate-y-1/2" />

      {/* Node options arranged in circle */}
      {nodeOptions.map((option) => {
        const angleRad = (option.angle - 90) * (Math.PI / 180);
        const x = Math.cos(angleRad) * radius;
        const y = Math.sin(angleRad) * radius;

        return (
          <button
            key={option.type}
            className={cn(
              'absolute flex flex-col items-center justify-center',
              'w-14 h-14 rounded-full',
              'bg-white border-2 border-gray-200',
              'hover:border-primary hover:bg-primary/10',
              'transition-all duration-150',
              'shadow-md hover:shadow-lg'
            )}
            style={{
              left: x,
              top: y,
              transform: 'translate(-50%, -50%)',
            }}
            onClick={() => handleSelectNode(option.type)}
            title={`${option.label} [${option.shortcutNumber}/${option.shortcutLetter.toUpperCase()}]`}
          >
            {option.icon}
            <span className="text-[10px] font-medium mt-0.5">{option.shortcutNumber}</span>
          </button>
        );
      })}

      {/* Hint text */}
      <div
        className="absolute text-xs text-muted-foreground bg-white/90 px-2 py-1 rounded whitespace-nowrap"
        style={{ top: radius + 40, left: '50%', transform: 'translateX(-50%)' }}
      >
        Press 1-5 or letter • Esc to cancel
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/components/Canvas/RadialNodePicker.tsx
git commit -m "feat: add RadialNodePicker component with keyboard shortcuts"
```

---

### Task 7: Integrate Components into WorkflowCanvas

**Files:**
- Modify: `src/components/Canvas/WorkflowCanvas.tsx`

- [ ] **Step 1: Add imports**

Add at the top with other imports:

```typescript
import { DirectionalIndicators } from './DirectionalIndicators';
import { RadialNodePicker } from './RadialNodePicker';
import { Direction } from '@/types/workflow';
```

- [ ] **Step 2: Add radial menu state and handlers**

Inside `WorkflowCanvasInner`, add after the existing store destructuring:

```typescript
const { openRadialMenu, closeRadialMenu, radialMenu } = useWorkflowStore();

const handleOpenRadialMenu = useCallback(
  (nodeId: string) => (direction: Direction, position: { x: number; y: number }) => {
    openRadialMenu(nodeId, direction, position);
  },
  [openRadialMenu]
);
```

- [ ] **Step 3: Create custom node wrapper with indicators**

Add before the return statement:

```typescript
// Wrap nodes with directional indicators
const nodesWithIndicators = useMemo(() => {
  return nodes.map((node) => ({
    ...node,
    // Store original node for indicator access
  }));
}, [nodes]);
```

- [ ] **Step 4: Add DirectionalIndicators as node overlay**

We need to render DirectionalIndicators for each node. The cleanest approach is to add them to the node components themselves. However, since we want to avoid modifying all 5 node files again, we'll use a wrapper approach via nodeTypes.

Update nodeTypes definition:

```typescript
import { memo, ComponentType } from 'react';
import { NodeProps } from '@xyflow/react';

function withDirectionalIndicators<T extends NodeProps>(
  WrappedComponent: ComponentType<T>,
  nodeType: string
) {
  return memo(function NodeWithIndicators(props: T) {
    const { openRadialMenu } = useWorkflowStore();

    const handleOpenRadialMenu = useCallback(
      (direction: Direction, position: { x: number; y: number }) => {
        openRadialMenu(props.id, direction, position);
      },
      [props.id, openRadialMenu]
    );

    return (
      <div className="relative">
        <WrappedComponent {...props} />
        <DirectionalIndicators
          node={props as unknown as WorkflowNode}
          onOpenRadialMenu={handleOpenRadialMenu}
        />
      </div>
    );
  });
}

const nodeTypes = {
  start: withDirectionalIndicators(StartNode, 'start'),
  end: withDirectionalIndicators(EndNode, 'end'),
  phase: withDirectionalIndicators(PhaseNode, 'phase'),
  approval: withDirectionalIndicators(ApprovalNode, 'approval'),
  decision: withDirectionalIndicators(DecisionNode, 'decision'),
};
```

- [ ] **Step 5: Add RadialNodePicker to render**

Add `<RadialNodePicker />` right before the closing `</div>` of the wrapper div (after the drop zone overlay):

```typescript
      {/* Radial menu for node spawning */}
      <RadialNodePicker />
    </div>
  );
```

- [ ] **Step 6: Verify build passes**

```bash
npm run build
```

Expected: Build succeeds

- [ ] **Step 7: Test manually**

```bash
npm run dev
```

1. Hover over a Phase node - verify directional indicators appear after ~150ms
2. Click an indicator pointing toward another node - verify connection is created
3. Click an indicator pointing to empty space - verify radial menu appears
4. Press number key or letter - verify node is created and connected
5. Press Escape - verify menu closes
6. Click outside menu - verify menu closes

- [ ] **Step 8: Commit**

```bash
git add src/components/Canvas/WorkflowCanvas.tsx
git commit -m "feat: integrate DirectionalIndicators and RadialNodePicker into canvas"
```

---

### Task 8: Run All Tests and Final Verification

**Files:**
- All

- [ ] **Step 1: Run all tests**

```bash
npm run test:run
```

Expected: All tests PASS

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: No errors

- [ ] **Step 3: Run build**

```bash
npm run build
```

Expected: Build succeeds

- [ ] **Step 4: Manual acceptance testing**

```bash
npm run dev
```

Verify all acceptance criteria:
1. ✅ Drag handles are visually larger (16×16px vs 12×12px)
2. ✅ Users can click a directional indicator to auto-connect to nearest node
3. ✅ If no node exists, radial menu allows spawning + connecting in one flow
4. ✅ Connection UX feels snappy and intuitive

- [ ] **Step 5: Commit any final fixes**

If any issues found, fix and commit:

```bash
git add -A
git commit -m "fix: address issues found in final verification"
```

---

### Task 9: Create Follow-up Issue

**Files:**
- None (GitHub API)

- [ ] **Step 1: Create follow-up issue for changing node type from UI**

```bash
gh issue create --repo Cake-Agentic-AI-Workflows/cake-workflow-builder \
  --title "[ENHANCEMENT] Change node type from context menu" \
  --body "## Description

Allow users to right-click a node and change its type (e.g., Phase → Approval) without deleting and recreating.

## Requirements

- Add context menu on right-click
- Show available node type options
- Preserve connections where possible when changing type
- Handle edge cases (e.g., changing to type with fewer handles)

## Related

Spawned from #5 implementation" \
  --label "enhancement"
```

- [ ] **Step 2: Commit plan completion**

```bash
git add docs/superpowers/plans/
git commit -m "docs: add implementation plan for improved handles and auto-connect"
```
