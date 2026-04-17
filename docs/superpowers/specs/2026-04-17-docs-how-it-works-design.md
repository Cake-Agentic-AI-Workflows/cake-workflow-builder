# Documentation System Design

**Issue:** #6 - [DOCS] Add 'How it works' documentation page  
**Date:** 2026-04-17  
**Status:** Approved

## Overview

Add a multi-page documentation system to Cake Workflow Builder explaining how the tool works for end users. Documentation is beginner-friendly, avoids programming jargon, and uses Mermaid diagrams for visual examples.

## Route Structure

```
src/app/docs/
├── layout.tsx          # Shared docs layout (sidebar nav, prose styling)
├── page.mdx            # /docs landing
├── how-it-works/
│   └── page.mdx        # /docs/how-it-works
├── export-guide/
│   └── page.mdx        # /docs/export-guide
└── best-practices/
    └── page.mdx        # /docs/best-practices
```

## Navigation

- Add "Docs" text link to main header, positioned after the title "Cake Workflow Builder" and before the Import button
- Style: same as other header buttons but as a link (`text-sm` with hover state)
- Links to `/docs`
- All docs pages include "← Back to Builder" link in the header (replaces the Docs link when on docs pages)

## Shared Docs Layout

```
┌─────────────────────────────────────────────────────┐
│  [Cake icon] Cake Workflow Builder    ← Back to Builder │
├─────────────┬───────────────────────────────────────┤
│             │                                       │
│  Sidebar    │   Content area                        │
│  - Home     │   (prose styling, max-width ~720px)   │
│  - How it   │                                       │
│    works    │   [MDX content renders here]          │
│  - Export   │                                       │
│    guide    │                                       │
│  - Best     │                                       │
│    practices│                                       │
│             │                                       │
└─────────────┴───────────────────────────────────────┘
```

**Sidebar:** Fixed width (~200px), lists doc pages with active state highlighting  
**Content:** Centered prose column using Tailwind Typography plugin  
**Theme:** Respects `prefers-color-scheme` — light default, dark mode for users who prefer it

## Page Content

### `/docs` (Landing)

- Brief welcome explaining what the builder does
- Card links to the three main sections
- Quick "Getting started" steps (3-4 bullets)

### `/docs/how-it-works`

- What is a visual workflow? (Mermaid diagram: nodes → flow)
- Node types: Start, Phase, Decision, Approval, End
- How connections define execution order
- Example workflow diagram

### `/docs/export-guide`

- What happens when you export (visual → SKILL.md)
- Anatomy of a SKILL.md file (frontmatter, phases, sections)
- How to use exported files in Claude Code
- Transformation flow diagram

### `/docs/best-practices`

- Keep workflows focused (one skill = one job)
- Use approvals for risky operations
- Name phases descriptively
- Anti-patterns to avoid (too many branches, unclear decisions)

## Mermaid Integration

Create a `<Mermaid>` React component:
- Client-side rendering (Mermaid requires DOM)
- Accepts diagram code as children
- Supports light/dark themes via Mermaid config

Usage in MDX:
```mdx
<Mermaid>
graph LR
  Start --> Phase1[Research]
  Phase1 --> Decision{Ready?}
  Decision -->|Yes| Phase2[Implement]
  Decision -->|No| Phase1
  Phase2 --> End
</Mermaid>
```

Planned diagrams:
1. Node types overview (how-it-works)
2. Simple workflow example (how-it-works)
3. Visual-to-SKILL.md transformation (export-guide)

## Dependencies

| Package | Purpose |
|---------|---------|
| `@next/mdx` | MDX support for Next.js |
| `@mdx-js/react` | MDX React runtime |
| `@tailwindcss/typography` | Prose styling |
| `mermaid` | Diagram rendering |

## Testing Strategy

**TDD approach — write tests first:**

1. Unit tests for `<Mermaid>` component (renders without error)
2. Smoke tests verifying each docs route loads
3. Manual verification of light/dark theme switching
4. Content review for jargon-free language

## Out of Scope

- UI screenshots (Mermaid diagrams satisfy the "visual examples" requirement; screenshots can be added later)
- Search functionality
- Versioned documentation
