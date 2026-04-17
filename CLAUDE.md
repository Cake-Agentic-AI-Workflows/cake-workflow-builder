# Cake Workflow Builder

Visual workflow builder for Cake skills — create SKILL.md files without writing markdown.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Canvas**: React Flow (@xyflow/react)
- **State**: Zustand
- **Styling**: Tailwind CSS
- **Testing**: Vitest
- **Language**: TypeScript (strict mode)

## Development Commands

```bash
npm install       # Install dependencies
npm run dev       # Start dev server (localhost:3000)
npm run build     # Production build
npm run lint      # ESLint
npm test          # Vitest watch mode
npm run test:run  # Single test run
```

## Architecture

### Directory Structure

```
src/
├── app/           # Next.js App Router pages and API routes
├── components/    # React components by feature
│   ├── Canvas/    # React Flow canvas, custom nodes/edges, radial menu
│   ├── ConfigPanel/   # Node and edge configuration forms
│   ├── Sidebar/   # Node palette, skill templates
│   ├── Export/    # SKILL.md export modal
│   └── Import/    # SKILL.md import modal
├── lib/           # Core logic (parser, generator, graph utils)
├── store/         # Zustand workflow state
├── types/         # TypeScript types for workflow and skills
├── test/          # Vitest tests organized by feature
└── utils/         # Utility functions (spatial calculations)
```

### Key Files

| File | Purpose |
|------|---------|
| `src/store/workflowStore.ts` | Central state: nodes, edges, metadata, selection, radial menu |
| `src/lib/skillParser.ts` | SKILL.md text → workflow nodes/edges |
| `src/lib/skillGenerator.ts` | Workflow nodes/edges → SKILL.md text |
| `src/lib/graphUtils.ts` | Graph traversal, loop detection, validation |

## Parser & Generator

### Round-Trip Flow

1. **Parser** reads SKILL.md frontmatter + markdown sections
2. Creates nodes for phases, approvals, decisions, start/end
3. Infers edges from "Go to:" references and phase order
4. **Generator** reverses: nodes/edges → valid SKILL.md format

### Known Limitations

These parser issues are tracked in the v1.0 milestone:

| Issue | Description |
|-------|-------------|
| #12 | Parser doesn't support `(max N iterations)` loop format |
| #11 | Parser requires quoted values for agent type and model |
| #10 | Parser creates linear chain instead of preserving decision topology |
| #9 | Parser captures trailing punctuation in loop targets |
| #7 | Generator should mark pre-decision phases as terminal |

## Code Conventions

### Principles

- **TDD**: Write tests first, implement to pass
- **DRY**: Extract repeated logic into utilities
- **KISS**: Prefer simple solutions over clever ones
- **YAGNI**: Only implement what's needed now

### Patterns

- Components use named exports
- Zustand store actions mutate state directly (immer-style)
- Tests organized by feature in `src/test/`
- Custom React Flow nodes extend base types from `@/types/workflow`
- Run `npm run test:run` before committing

## Related Resources

- [Cake CLI](https://github.com/CachoobiDoobi/cake-cli) — The skill runtime this builder targets
- `docs/superpowers/specs/` — Design specs for major features
- [GitHub Issues](https://github.com/Cake-Agentic-AI-Workflows/cake-workflow-builder/issues) — Known bugs and enhancements
