# Clear/Reset Board Button Design

**Issue:** [#4 - Add clear/reset board button](https://github.com/Cake-Agentic-AI-Workflows/cake-workflow-builder/issues/4)  
**Date:** 2026-04-13

## Overview

Add a visible clear/reset button to the canvas that resets the board to an empty state, with a confirmation dialog to prevent accidental data loss. Additionally, fix the "New" button to open a new tab instead of resetting the current canvas.

## Requirements

From GitHub Issue #4:
1. Clear button is visible and accessible in the UI
2. Clicking clears all nodes and edges from the canvas
3. Confirmation dialog before clearing (to prevent accidental data loss)

Additional scope (per user request):
4. Fix "New" button to open a new browser tab instead of resetting

## Design

### 1. Clear Button Component

**Location:** Floating in the bottom-left corner of the canvas, inside the React Flow container in `WorkflowCanvas.tsx`.

**Appearance:**
- Red/danger colored button (`bg-red-500`, `text-white`)
- Trash icon (from lucide-react) + "Clear" text
- Positioned with `absolute bottom-4 left-4`
- Subtle shadow to stand out from canvas background

**Behavior:**
- Click opens the confirmation modal
- Disabled when canvas is already empty (only Start/End nodes present, no edges between them, no other nodes)

### 2. Confirmation Modal

**New component:** `src/components/ConfirmModal/ConfirmModal.tsx`

A reusable confirmation dialog component following the existing modal pattern.

**Props:**
```typescript
interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;      // default: "Confirm"
  confirmVariant?: 'danger' | 'primary';  // default: "primary"
}
```

**Visual structure:**
- Modal backdrop (`bg-black/50`, centered)
- Smaller card than Export/Import modals
- Header with title and X close button
- Body with message text
- Footer with Cancel (neutral) and Confirm button (red for danger variant)

**Accessibility:**
- Focus trap: Tab cycles between Cancel and Confirm buttons
- Escape key closes modal
- `aria-labelledby` pointing to title
- `aria-describedby` pointing to message
- `role="dialog"` and `aria-modal="true"`

### 3. New Button Behavior Fix

**Current behavior:** Calls `resetWorkflow()` which clears the current canvas.

**New behavior:** Opens the app in a new browser tab via:
```typescript
window.open(window.location.href, '_blank')
```

No confirmation needed since this doesn't affect current canvas state.

### 4. Integration & Data Flow

**State in `page.tsx`:**
- Add `showClearConfirm` boolean state
- Clear button click → `setShowClearConfirm(true)`
- Modal cancel/close → `setShowClearConfirm(false)`
- Modal confirm → `resetWorkflow()` then `setShowClearConfirm(false)`

**File changes:**
1. `src/components/ConfirmModal/ConfirmModal.tsx` — new reusable modal component
2. `src/components/Canvas/WorkflowCanvas.tsx` — add floating Clear button
3. `src/app/page.tsx` — wire up confirm modal state, fix New button behavior

**No store changes needed** — `resetWorkflow()` already exists and handles the reset correctly.

## Testing

- Clear button visible on canvas
- Clear button disabled when canvas is empty
- Clicking Clear opens confirmation modal
- Cancel closes modal without clearing
- Confirm clears canvas and closes modal
- Escape key closes modal
- New button opens new tab
- New button does not affect current canvas
