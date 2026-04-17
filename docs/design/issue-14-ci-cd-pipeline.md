# Design: CI/CD Pipeline

**Ticket:** [#14 - Create CI/CD pipeline](https://github.com/Cake-Agentic-AI-Workflows/cake-workflow-builder/issues/14)  
**Author:** Claude  
**Date:** 2026-04-17  
**Status:** Draft

## Overview

Set up a GitHub Actions workflow that runs quality checks on all pull requests to catch issues before merge.

## Requirements

From the ticket:
- [x] Run linting on PRs
- [x] Run type checking on PRs
- [x] Run unit tests on PRs
- [x] Build verification
- [ ] Deploy preview builds (skipped per user request)

## Current State

- **Existing workflow:** `.github/workflows/release.yml` handles versioning and releases on main branch
- **No PR checks:** Currently no automated quality gates for pull requests
- **Commands available:**
  - `npm run lint` - ESLint via Next.js
  - `npx tsc --noEmit` - TypeScript type checking
  - `npm run test:run` - Vitest single run
  - `npm run build` - Next.js production build

## Proposed Solution

Create `.github/workflows/ci.yml` that triggers on pull requests and push to main.

### Workflow Design

```yaml
name: CI

on:
  pull_request:
    branches: [main]

permissions:
  contents: read

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  ci:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - Checkout code (shallow clone)
      - Setup Node.js 18 with npm cache
      - Install dependencies with npm ci
      - Run lint
      - Run type check
      - Run tests
      - Run build
```

**Note:** CI only runs on PRs, not on push to main. The release workflow on main is independent - PRs must pass CI before merge (enforced by branch protection), so any commit reaching main has already been validated.

### Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Node version | 20 | Required by vitest, jsdom, vite dependencies |
| Single job vs matrix | Single job | Simpler, tests only need Node 18 |
| Dependency install | `npm ci` | Deterministic, respects lock file exactly |
| Dependency caching | npm cache keyed on `package-lock.json` | Faster CI runs, consistent |
| Concurrency | Cancel in-progress on new push | Saves resources, avoids zombie runs |
| Permissions | Explicit `contents: read` | Security best practice |
| Timeout | 15 minutes | Prevents hung builds |
| PR triggers only | No push to main | Avoids race with release workflow |

### File Changes

| File | Action | Purpose |
|------|--------|---------|
| `.github/workflows/ci.yml` | Create | Main CI workflow |

## Testing Strategy

1. Create PR with the workflow file
2. Verify all checks run and pass
3. Intentionally break something to verify failure detection

## Alternatives Considered

1. **Matrix testing (Node 18 + 20):** Rejected - overkill for this project, 18 is sufficient
2. **Vercel preview deploys:** Rejected per user - requires additional setup
3. **Separate jobs per check:** Rejected - single job is simpler and fast enough

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Tests flaky in CI | Low | Medium | Tests run in jsdom, no browser dependencies |
| Build fails in CI | Low | Low | Same Node version as local dev |
| Long CI times | Low | Low | npm caching enabled |

## Acceptance Criteria Mapping

| Criteria | How Addressed |
|----------|---------------|
| All checks run automatically on PRs | Workflow triggers on `pull_request` |
| Failed checks block merge | Branch protection rule (see below) |
| Clear feedback on failures | Each step named clearly, logs available |

### Required Branch Protection Setup

After merging the workflow, configure in GitHub repo Settings > Branches > Add rule:

- **Branch name pattern:** `main`
- **Require status checks to pass before merging:** ✓
- **Status checks that are required:** Select `ci` job
- **Require branches to be up to date before merging:** ✓ (recommended)
