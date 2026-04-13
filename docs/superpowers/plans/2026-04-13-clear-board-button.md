# Clear/Reset Board Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a floating clear button on the canvas with confirmation dialog, and fix the New button to open a new tab.

**Architecture:** Create a reusable ConfirmModal component following existing modal patterns. Add a floating ClearButton to WorkflowCanvas. Wire up state and handlers in page.tsx.

**Tech Stack:** React, TypeScript, Tailwind CSS, lucide-react icons

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/components/ConfirmModal/ConfirmModal.tsx` | Create | Reusable confirmation dialog with accessibility |
| `src/components/Canvas/ClearButton.tsx` | Create | Floating clear button component |
| `src/components/Canvas/WorkflowCanvas.tsx` | Modify | Import and render ClearButton |
| `src/app/page.tsx` | Modify | Wire up ConfirmModal, fix New button |

---

### Task 1: Create ConfirmModal Component

**Files:**
- Create: `src/components/ConfirmModal/ConfirmModal.tsx`

- [ ] **Step 1: Create the ConfirmModal component file**

Create `src/components/ConfirmModal/ConfirmModal.tsx`:

```tsx
'use client';

import { useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  confirmVariant?: 'danger' | 'primary';
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  confirmVariant = 'primary',
}: ConfirmModalProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  // Focus trap: cycle between Cancel and Confirm buttons
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      if (event.key === 'Tab') {
        const focusableElements = [cancelButtonRef.current, confirmButtonRef.current].filter(Boolean);
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement?.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement?.focus();
          }
        }
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Focus the cancel button when modal opens
      cancelButtonRef.current?.focus();
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const confirmButtonClasses =
    confirmVariant === 'danger'
      ? 'bg-red-500 text-white hover:bg-red-600'
      : 'bg-primary text-primary-foreground hover:bg-primary/90';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      aria-describedby="confirm-modal-message"
    >
      <div className="bg-card w-full max-w-md rounded-lg shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 id="confirm-modal-title" className="text-lg font-semibold">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4">
          <p id="confirm-modal-message" className="text-sm text-muted-foreground">
            {message}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t">
          <button
            ref={cancelButtonRef}
            onClick={onClose}
            className="px-4 py-2 text-sm border rounded hover:bg-muted"
          >
            Cancel
          </button>
          <button
            ref={confirmButtonRef}
            onClick={onConfirm}
            className={`px-4 py-2 text-sm rounded ${confirmButtonClasses}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the component compiles**

Run: `npm run build 2>&1 | head -30`

Expected: No TypeScript errors related to ConfirmModal

- [ ] **Step 3: Commit**

```bash
git add src/components/ConfirmModal/ConfirmModal.tsx
git commit -m "feat: add reusable ConfirmModal component"
```

---

### Task 2: Create ClearButton Component

**Files:**
- Create: `src/components/Canvas/ClearButton.tsx`

- [ ] **Step 1: Create the ClearButton component file**

Create `src/components/Canvas/ClearButton.tsx`:

```tsx
'use client';

import { Trash2 } from 'lucide-react';
import { useWorkflowStore } from '@/store/workflowStore';

interface ClearButtonProps {
  onClick: () => void;
}

export function ClearButton({ onClick }: ClearButtonProps) {
  const { nodes, edges } = useWorkflowStore();

  // Canvas is empty if only Start/End nodes exist and no edges
  const hasContentNodes = nodes.some(
    (node) => node.type !== 'start' && node.type !== 'end'
  );
  const hasEdges = edges.length > 0;
  const isEmpty = !hasContentNodes && !hasEdges;

  return (
    <button
      onClick={onClick}
      disabled={isEmpty}
      className={`
        flex items-center gap-2 px-3 py-2 text-sm font-medium rounded shadow-md
        ${
          isEmpty
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-red-500 text-white hover:bg-red-600'
        }
      `}
      title={isEmpty ? 'Canvas is already empty' : 'Clear all nodes and edges'}
    >
      <Trash2 className="w-4 h-4" />
      Clear
    </button>
  );
}
```

- [ ] **Step 2: Verify the component compiles**

Run: `npm run build 2>&1 | head -30`

Expected: No TypeScript errors related to ClearButton

- [ ] **Step 3: Commit**

```bash
git add src/components/Canvas/ClearButton.tsx
git commit -m "feat: add ClearButton component for canvas"
```

---

### Task 3: Add ClearButton to WorkflowCanvas

**Files:**
- Modify: `src/components/Canvas/WorkflowCanvas.tsx:1-27` (imports)
- Modify: `src/components/Canvas/WorkflowCanvas.tsx:226-229` (add Panel with ClearButton)

- [ ] **Step 1: Add import for ClearButton**

In `src/components/Canvas/WorkflowCanvas.tsx`, add after line 25 (after the DecisionNode import):

```tsx
import { ClearButton } from './ClearButton';
```

- [ ] **Step 2: Add onClearClick prop to WorkflowCanvasInner**

Replace the function signature at line 39:

```tsx
function WorkflowCanvasInner({ onClearClick }: { onClearClick: () => void }) {
```

- [ ] **Step 3: Add ClearButton Panel inside ReactFlow**

After the existing Panel at line 226-228, add a new Panel:

```tsx
        <Panel position="bottom-left">
          <ClearButton onClick={onClearClick} />
        </Panel>
```

- [ ] **Step 4: Update WorkflowCanvas wrapper to accept and pass prop**

Replace the WorkflowCanvas component at line 245-250:

```tsx
interface WorkflowCanvasProps {
  onClearClick: () => void;
}

export function WorkflowCanvas({ onClearClick }: WorkflowCanvasProps) {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner onClearClick={onClearClick} />
    </ReactFlowProvider>
  );
}
```

- [ ] **Step 5: Verify the component compiles (will fail - page.tsx needs update)**

Run: `npm run build 2>&1 | head -30`

Expected: Error about missing onClearClick prop in page.tsx (this is expected, will fix in next task)

- [ ] **Step 6: Commit**

```bash
git add src/components/Canvas/WorkflowCanvas.tsx
git commit -m "feat: add ClearButton to WorkflowCanvas"
```

---

### Task 4: Wire Up ConfirmModal and Fix New Button in page.tsx

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Add ConfirmModal import**

In `src/app/page.tsx`, add after the ImportModal import (line 8):

```tsx
import { ConfirmModal } from '@/components/ConfirmModal/ConfirmModal';
```

- [ ] **Step 2: Add showClearConfirm state**

After line 14 (`const [showImport, setShowImport] = useState(false);`), add:

```tsx
const [showClearConfirm, setShowClearConfirm] = useState(false);
```

- [ ] **Step 3: Add handler functions**

After the `const { resetWorkflow } = useWorkflowStore();` line, add:

```tsx
const handleClearClick = () => {
  setShowClearConfirm(true);
};

const handleClearConfirm = () => {
  resetWorkflow();
  setShowClearConfirm(false);
};

const handleNewClick = () => {
  window.open(window.location.href, '_blank');
};
```

- [ ] **Step 4: Update New button onClick**

Change the New button (around line 40-46) from `onClick={resetWorkflow}` to `onClick={handleNewClick}`:

```tsx
          <button
            onClick={handleNewClick}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" />
            New
          </button>
```

- [ ] **Step 5: Pass onClearClick to WorkflowCanvas**

Change `<WorkflowCanvas />` to:

```tsx
        <WorkflowCanvas onClearClick={handleClearClick} />
```

- [ ] **Step 6: Add ConfirmModal to modals section**

After the ImportModal (around line 59), add:

```tsx
      <ConfirmModal
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={handleClearConfirm}
        title="Clear Canvas"
        message="Are you sure you want to clear the canvas? This will remove all nodes and edges. This action cannot be undone."
        confirmText="Clear"
        confirmVariant="danger"
      />
```

- [ ] **Step 7: Verify the build passes**

Run: `npm run build`

Expected: Build succeeds with no errors

- [ ] **Step 8: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: wire up clear confirmation modal and fix New button"
```

---

### Task 5: Manual Testing

**Files:** None (testing only)

- [ ] **Step 1: Start dev server**

Run: `npm run dev`

Expected: Server starts on http://localhost:3000

- [ ] **Step 2: Test Clear button visibility**

1. Open http://localhost:3000
2. Verify Clear button is visible in bottom-left of canvas
3. Verify Clear button is disabled (grayed out) on empty canvas

Expected: Red "Clear" button with trash icon in bottom-left, disabled state

- [ ] **Step 3: Test Clear button enable state**

1. Drag a Phase node onto the canvas
2. Verify Clear button becomes enabled (red, clickable)

Expected: Clear button turns red and is clickable

- [ ] **Step 4: Test confirmation modal - Cancel**

1. Click the Clear button
2. Verify confirmation modal appears with title "Clear Canvas"
3. Click Cancel
4. Verify modal closes and canvas is unchanged

Expected: Modal appears, Cancel closes it without clearing

- [ ] **Step 5: Test confirmation modal - Escape key**

1. Click the Clear button
2. Press Escape key
3. Verify modal closes and canvas is unchanged

Expected: Escape key closes modal

- [ ] **Step 6: Test confirmation modal - Confirm**

1. Add a node to the canvas
2. Click the Clear button
3. Click "Clear" in the modal
4. Verify canvas is reset (only Start and End nodes remain)

Expected: Canvas clears, modal closes

- [ ] **Step 7: Test New button**

1. Click the "New" button in the header
2. Verify a new browser tab opens with the same URL
3. Verify the original tab's canvas is unchanged

Expected: New tab opens, original tab unaffected

- [ ] **Step 8: Commit test verification**

```bash
git commit --allow-empty -m "test: manually verified clear button and New button functionality"
```

---

### Task 6: Final Cleanup

**Files:** None

- [ ] **Step 1: Run linter**

Run: `npm run lint`

Expected: No linting errors

- [ ] **Step 2: Run type check**

Run: `npm run build`

Expected: Build succeeds

- [ ] **Step 3: Final commit if any fixes were needed**

If any fixes were made:
```bash
git add -A
git commit -m "fix: address linting and type issues"
```
