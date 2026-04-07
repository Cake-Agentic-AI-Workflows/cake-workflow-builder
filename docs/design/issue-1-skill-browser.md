# Design: Display and Edit Cake Skills from External Repo

**Issue:** [#1](https://github.com/Cake-Agentic-AI-Workflows/cake-workflow-builder/issues/1)  
**Author:** Claude  
**Date:** 2026-04-07

## Overview

Add a skill browser to the sidebar that fetches skills from the [cake-skills repository](https://github.com/Cake-Agentic-AI-Workflows/cake-skills), displays them with minimal info (name + description), and allows users to load them onto the board for editing.

## Requirements

### Functional
1. Fetch skills dynamically from GitHub API (with caching)
2. Display skills in sidebar below node palette
3. Load selected skill onto board
4. Edit loaded skills using existing board tools
5. Changes remain local/in-session

### Non-Functional
- Graceful error handling (network failures, parse errors)
- Loading states for fetch operations
- Cache skills to reduce API calls

## Current State

### Existing Architecture
- **Zustand store** (`src/store/workflowStore.ts`) with `loadWorkflow()` method
- **Skill parser** (`src/lib/skillParser.ts`) - `parseSkillMd()` converts SKILL.md to workflow
- **Import modal** (`src/components/Import/ImportModal.tsx`) - handles file/paste import
- **Sidebar** (`src/components/Sidebar/`) - contains NodePalette

### Skill Format (cake-skills repo)
```
skills/
├── cake/SKILL.md
├── issue-creator/SKILL.md
└── architecture-diagram/SKILL.md
```

Each SKILL.md has YAML frontmatter:
```yaml
---
name: skill-name
description: Brief description
metadata:
  tags: [tag1, tag2]
  author: Author Name
  version: "1.0.0"
  user-invocable: true
---
```

## Proposed Solution

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Sidebar                            │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐   │
│  │            Node Palette (existing)              │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │         Skill Templates (NEW)                   │   │
│  │  ┌─────────────────────────────────────────┐   │   │
│  │  │ 🔄 Loading... / ❌ Error + Retry        │   │   │
│  │  └─────────────────────────────────────────┘   │   │
│  │  ┌─────────────────────────────────────────┐   │   │
│  │  │ cake                                    │   │   │
│  │  │ End-to-end ticket to PR automation     │   │   │
│  │  └─────────────────────────────────────────┘   │   │
│  │  ┌─────────────────────────────────────────┐   │   │
│  │  │ issue-creator                           │   │   │
│  │  │ Create issues from natural language    │   │   │
│  │  └─────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Data Flow

```
1. Component mounts → Check localStorage cache
2. If cache valid (< 1 hour) → Use cached data
3. If cache stale/missing → Fetch from GitHub API
4. Parse skill list → Extract name/description from frontmatter
5. User clicks skill → Fetch full SKILL.md content
6. Parse with parseSkillMd() → loadWorkflow()
```

### Key File Changes

| File | Change | Rationale |
|------|--------|-----------|
| `src/lib/githubSkills.ts` | **NEW** - GitHub API fetching + caching | Encapsulate external data fetching |
| `src/lib/skillParser.ts` | **MODIFY** - Export `parseFrontmatter` | Reuse frontmatter parsing in githubSkills |
| `src/components/Sidebar/SkillTemplates.tsx` | **NEW** - Skill browser component | Display skills in sidebar |
| `src/app/page.tsx` | **MODIFY** - Add SkillTemplates to sidebar area | No Sidebar.tsx exists; integrate directly in page layout |
| `src/types/skill.ts` | **NEW** - SkillMeta type | Type safety for skill metadata |

### Implementation Details

#### 1. New Type: `src/types/skill.ts`

```typescript
export interface SkillMeta {
  name: string;
  description: string;
  slug: string; // directory name, e.g., "cake"
}

export interface SkillCache {
  skills: SkillMeta[];
  timestamp: number;
}
```

#### 2. GitHub API Service: `src/lib/githubSkills.ts`

```typescript
import { parseFrontmatter } from './skillParser';
import type { SkillMeta, SkillCache } from '@/types/skill';

const REPO = 'Cake-Agentic-AI-Workflows/cake-skills';
const CACHE_KEY = 'cake-skills-cache';
const CACHE_TTL = 60 * 60 * 1000; // 1 hour
const MAX_CONTENT_SIZE = 100 * 1024; // 100KB limit

export async function fetchSkillsList(): Promise<SkillMeta[]> {
  // Check cache first
  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    const cache: SkillCache = JSON.parse(cached);
    if (Date.now() - cache.timestamp < CACHE_TTL) return cache.skills;
  }

  try {
    // Fetch directory listing
    const res = await fetch(
      `https://api.github.com/repos/${REPO}/contents/skills`
    );
    if (!res.ok) {
      throw new Error(`GitHub API error: ${res.status}`);
    }
    
    const items = await res.json();
    if (!Array.isArray(items)) {
      throw new Error('Invalid response format');
    }
    
    // Filter to directories only (skip files like README.md)
    const dirs = items.filter((item: { type: string }) => item.type === 'dir');
    
    // Fetch each skill's frontmatter with Promise.allSettled for resilience
    const results = await Promise.allSettled(
      dirs.map(async (dir: { name: string }) => {
        const skillRes = await fetch(
          `https://raw.githubusercontent.com/${REPO}/main/skills/${dir.name}/SKILL.md`
        );
        if (!skillRes.ok) throw new Error(`Failed to fetch ${dir.name}`);
        const content = await skillRes.text();
        if (content.length > MAX_CONTENT_SIZE) {
          throw new Error(`Skill ${dir.name} exceeds size limit`);
        }
        const meta = parseFrontmatter(content);
        return { name: meta.name, description: meta.description, slug: dir.name };
      })
    );
    
    // Extract successful results
    const skills = results
      .filter((r): r is PromiseFulfilledResult<SkillMeta> => r.status === 'fulfilled')
      .map(r => r.value);
    
    // Cache results (with error handling for full localStorage)
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ skills, timestamp: Date.now() }));
    } catch {
      // localStorage full, continue without caching
    }
    
    return skills;
  } catch (error) {
    // On failure, return stale cache if available
    if (cached) {
      const staleCache: SkillCache = JSON.parse(cached);
      return staleCache.skills;
    }
    throw error;
  }
}

export async function fetchSkillContent(slug: string): Promise<string> {
  const res = await fetch(
    `https://raw.githubusercontent.com/${REPO}/main/skills/${slug}/SKILL.md`
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch skill: ${res.status}`);
  }
  return res.text();
}
```

#### 3. Export parseFrontmatter: `src/lib/skillParser.ts`

Add `export` to the existing `parseFrontmatter` function so it can be reused.

#### 4. Skill Templates Component: `src/components/Sidebar/SkillTemplates.tsx`

```tsx
import { useState, useEffect } from 'react';
import { fetchSkillsList, fetchSkillContent } from '@/lib/githubSkills';
import { parseSkillMd } from '@/lib/skillParser';
import { useWorkflowStore } from '@/store/workflowStore';
import type { SkillMeta } from '@/types/skill';

export function SkillTemplates() {
  const [skills, setSkills] = useState<SkillMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingSlug, setLoadingSlug] = useState<string | null>(null);
  const loadWorkflow = useWorkflowStore((s) => s.loadWorkflow);
  const nodes = useWorkflowStore((s) => s.nodes);

  const fetchSkills = () => {
    setLoading(true);
    setError(null);
    fetchSkillsList()
      .then(setSkills)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSkills();
  }, []);

  const handleLoadSkill = async (slug: string) => {
    // Confirm if there are existing nodes (beyond start/end)
    const hasWork = nodes.length > 2;
    if (hasWork) {
      const confirmed = window.confirm(
        'This will replace your current workflow. Continue?'
      );
      if (!confirmed) return;
    }
    
    setLoadingSlug(slug);
    try {
      const content = await fetchSkillContent(slug);
      const { nodes, edges, metadata } = parseSkillMd(content);
      loadWorkflow(nodes, edges, metadata);
    } catch (e) {
      alert(`Failed to load skill: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setLoadingSlug(null);
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Loading templates...
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-4 space-y-2">
        <p className="text-sm text-destructive">{error}</p>
        <button 
          onClick={fetchSkills}
          className="text-sm underline hover:no-underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-4">
      <h3 className="text-sm font-medium text-muted-foreground">Skill Templates</h3>
      {skills.map((skill) => (
        <button
          key={skill.slug}
          onClick={() => handleLoadSkill(skill.slug)}
          disabled={loadingSlug === skill.slug}
          className="w-full text-left p-2 rounded border hover:bg-accent transition-colors disabled:opacity-50"
        >
          <div className="font-medium text-sm">{skill.name}</div>
          <div className="text-xs text-muted-foreground line-clamp-2">
            {skill.description}
          </div>
          {loadingSlug === skill.slug && (
            <div className="text-xs text-muted-foreground mt-1">Loading...</div>
          )}
        </button>
      ))}
    </div>
  );
}
```

#### 5. Modify page layout: `src/app/page.tsx`

Add `<SkillTemplates />` below NodePalette in the sidebar area with a divider.

## Testing Strategy

1. **Unit tests** for `githubSkills.ts`:
   - Cache hit/miss logic
   - Frontmatter parsing
   - Error handling

2. **Component tests** for `SkillTemplates.tsx`:
   - Loading state renders
   - Error state with retry
   - Skill list renders correctly
   - Click triggers loadWorkflow

3. **Integration test**:
   - Load skill → verify nodes appear on canvas
   - Edit loaded skill → verify changes persist locally

## Alternatives Considered

| Alternative | Pros | Cons | Decision |
|-------------|------|------|----------|
| Modal gallery | More screen space | Extra click to access | Rejected - sidebar faster |
| Static bundle | No network needed | Stale data | Rejected - want fresh skills |
| Extend ImportModal | Reuses existing UI | Clutters import flow | Rejected - separate concerns |

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| GitHub API rate limits | Cache for 1 hour; fall back to stale cache on failure |
| Large skill files | Content size limit (100KB); fetch only when user clicks |
| Parse errors | Use existing `parseSkillMd()` which handles errors gracefully |
| CORS issues | Use raw.githubusercontent.com (no CORS) |
| Replacing unsaved work | Confirmation dialog before loading if workflow has nodes |
| Single skill fetch failure | Use `Promise.allSettled` so one failure doesn't break all |
| localStorage full | Wrap setItem in try/catch, continue without caching |

## Open Questions (Resolved)

- ~~Caching strategy~~ → 1 hour localStorage cache
- ~~Skill format~~ → Existing SKILL.md with YAML frontmatter
- ~~Local save~~ → Out of scope per issue

## Acceptance Checklist

- [ ] Skill Templates section visible in sidebar
- [ ] Skills fetched from GitHub API
- [ ] Cache reduces redundant API calls
- [ ] Click skill loads it onto board
- [ ] Editing works identically to new workflows
- [ ] Loading/error states handled gracefully
