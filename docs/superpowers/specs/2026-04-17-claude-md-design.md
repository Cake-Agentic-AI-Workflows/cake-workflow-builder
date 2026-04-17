# Design Spec: CLAUDE.md for Cake Workflow Builder

**Issue**: #20
**Date**: 2026-04-17
**Status**: Approved

## Overview

Create a comprehensive CLAUDE.md file at the project root to help Claude Code understand the project structure, conventions, and known limitations when contributing.

## Document Structure

### 1. Project Overview (~10 lines)
- What: Visual workflow builder for Cake skills (SKILL.md files)
- Purpose: Create workflow diagrams that export to valid SKILL.md format
- Tech stack: Next.js 14, React Flow, Zustand, TypeScript, Tailwind, Vitest

### 2. Development Commands (~15 lines)
Document all npm scripts:
- `npm install` - Install dependencies
- `npm run dev` - Start dev server (localhost:3000)
- `npm run build` - Production build
- `npm run lint` - ESLint
- `npm test` - Vitest watch mode
- `npm run test:run` - Single test run

### 3. Architecture (~25 lines)
Directory structure with purpose:
- `src/app/` - Next.js App Router pages and API routes
- `src/components/` - React components organized by feature
  - `Canvas/` - React Flow canvas, custom nodes, edges, radial menu
  - `ConfigPanel/` - Node/edge configuration forms
  - `Sidebar/` - Node palette, skill templates
  - `Export/` & `Import/` - SKILL.md file handling
- `src/lib/` - Core logic (parser, generator, graph utils)
- `src/store/` - Zustand workflow state
- `src/types/` - TypeScript types for workflow and skills
- `src/test/` - Vitest tests organized by feature
- `src/utils/` - Utility functions (spatial calculations)

Key files:
- `workflowStore.ts` - Central state: nodes, edges, metadata, selection
- `skillParser.ts` - SKILL.md text → workflow nodes/edges
- `skillGenerator.ts` - Workflow nodes/edges → SKILL.md text

### 4. Parser & Generator (~20 lines)
How round-tripping works:
1. Parser reads SKILL.md frontmatter + markdown sections
2. Creates nodes for phases, approvals, decisions, start/end
3. Infers edges from "Go to:" references and phase order
4. Generator reverses: nodes/edges → valid SKILL.md format

Known limitations (from v1.0 milestone issues):
- #12: Parser doesn't support `(max N iterations)` loop format
- #11: Parser requires quoted values for agent type and model
- #10: Parser creates linear chain instead of preserving decision topology
- #9: Parser captures trailing punctuation in loop targets
- #7: Generator should mark pre-decision phases as terminal

### 5. Code Conventions (~15 lines)
Principles:
- **TDD**: Write tests first, implement to pass
- **DRY**: Extract repeated logic into utilities
- **KISS**: Prefer simple solutions over clever ones
- **YAGNI**: Only implement what's needed now

Patterns observed in codebase:
- Components use named exports
- Zustand store actions mutate state directly (immer-style)
- Tests organized by feature in `src/test/`
- Custom React Flow nodes extend base node types from `@/types/workflow`

### 6. Related Resources (~5 lines)
- [Cake CLI](https://github.com/CachoobiDoobi/cake-cli) - The skill runtime this builder targets
- `docs/superpowers/specs/` - Design specs for major features
- GitHub Issues - Known bugs and enhancement requests

## Implementation

Single task: Create `/CLAUDE.md` with all sections above.

## Acceptance Criteria

1. CLAUDE.md exists at project root
2. All 6 sections present with accurate information
3. Known parser issues referenced by issue number
4. Related resources linked correctly
