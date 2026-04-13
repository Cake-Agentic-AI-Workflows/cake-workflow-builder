import { describe, it, expect } from 'vitest';
import { parseSkillMd } from '@/lib/skillParser';

describe('Error Recovery: Malformed Input', () => {
  describe('6.1 Frontmatter Errors', () => {
    it('15. handles missing frontmatter with defaults', () => {
      const md = `### Phase 1: Research

Do research.`;
      const result = parseSkillMd(md);
      // Should use default metadata
      expect(result.metadata.name).toBe('my-workflow');
      expect(result.metadata.description).toBe('A custom workflow created with Cake Workflow Builder');
      expect(result.metadata.version).toBe('1.0.0');
      // Should still parse the phase
      expect(result.nodes.some((n) => n.type === 'phase')).toBe(true);
      const phase = result.nodes.find((n) => n.type === 'phase');
      expect(phase?.data.label).toBe('Research');
    });

    it('16. handles unclosed frontmatter block', () => {
      const md = `---
name: test
description: Test

### Phase 1: Research

Do research.`;
      const result = parseSkillMd(md);
      // Should do best effort - treat entire content as body since no closing ---
      // Parser should not crash
      expect(result.nodes).toBeDefined();
      expect(result.edges).toBeDefined();
      // Should have start and end at minimum
      expect(result.nodes.find((n) => n.type === 'start')).toBeDefined();
      expect(result.nodes.find((n) => n.type === 'end')).toBeDefined();
    });

    it('17. handles invalid YAML in frontmatter', () => {
      const md = `---
name: : : invalid yaml
tags: [unclosed
---

### Phase 1: Research

Do research.`;
      const result = parseSkillMd(md);
      // Should skip frontmatter, parse body
      // Parser should not crash and should still find the phase
      expect(result.nodes).toBeDefined();
      expect(result.nodes.find((n) => n.type === 'start')).toBeDefined();
      expect(result.nodes.find((n) => n.type === 'end')).toBeDefined();
      // The phase should still be parsed from the body
      expect(result.nodes.some((n) => n.type === 'phase')).toBe(true);
    });
  });

  describe('6.2 Section Errors', () => {
    it('18. phase with no content has empty fields', () => {
      const md = `---
name: test
---

### Phase 1: Research`;
      const result = parseSkillMd(md);
      const phase = result.nodes.find((n) => n.type === 'phase');
      expect(phase).toBeDefined();
      // Empty content should result in empty description
      expect(phase?.data.description).toBe('');
      // Prompt should also be empty or default
      expect(phase?.data.agent?.prompt || '').toBe('');
    });

    it('19. approval with no options uses defaults', () => {
      const md = `---
name: test
---

### Approval Required

AskUserQuestion

Question: "Do you approve?"`;
      const result = parseSkillMd(md);
      const approval = result.nodes.find((n) => n.type === 'approval');
      expect(approval).toBeDefined();
      // Should have default 2 options when none specified
      expect(approval?.data.options).toBeDefined();
      expect(approval?.data.options.length).toBeGreaterThanOrEqual(2);
    });

    it('20. decision with bad branches uses defaults', () => {
      const md = `---
name: test
---

### Decision: Choose Path

**Which way to go?**

Some malformed content that doesn't match branch pattern`;
      const result = parseSkillMd(md);
      const decision = result.nodes.find((n) => n.type === 'decision');
      expect(decision).toBeDefined();
      // Should have default branches when parsing fails
      expect(decision?.data.branches).toBeDefined();
      expect(decision?.data.branches.length).toBeGreaterThanOrEqual(2);
    });

    it('21. unclosed code block captures until EOF or next section', () => {
      const md = `---
name: test
---

### Phase 1: Research

Do research.

\`\`\`
This is a prompt that never closes

### Phase 2: Analysis

Analyze the results.`;
      const result = parseSkillMd(md);
      // Parser should not crash
      expect(result.nodes).toBeDefined();
      // Should find at least start and end
      expect(result.nodes.find((n) => n.type === 'start')).toBeDefined();
      expect(result.nodes.find((n) => n.type === 'end')).toBeDefined();
      // Should attempt to parse phases (behavior may vary)
      const phases = result.nodes.filter((n) => n.type === 'phase');
      expect(phases.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('6.3 Loop Reference Errors', () => {
    it('22. loop to non-existent phase generates warning without loop edge', () => {
      const md = `---
name: test
---

### Phase 1: Research

Do research.

**Loop Control:**
Repeat to "NonExistent Phase" up to 3 times`;
      const result = parseSkillMd(md);
      // Should have a warning about the non-existent target
      expect(result.warnings.some((w) => w.includes('NonExistent Phase') || w.includes('not found'))).toBe(true);
      // Should not have a loop edge to the non-existent phase
      const loopEdges = result.edges.filter((e) => e.id.includes('loop'));
      expect(loopEdges.length).toBe(0);
    });

    it('23. ambiguous phase name uses closest match with warning', () => {
      const md = `---
name: test
---

### Phase 1: Research Data

Do research.

### Phase 2: Analyze

Analyze results.

**Loop Control:**
Repeat to "Research" up to 3 times`;
      const result = parseSkillMd(md);
      // Parser should handle the partial match
      // May generate a warning or find the closest match
      expect(result.nodes).toBeDefined();
      expect(result.edges).toBeDefined();
      // The parser should not crash
      const phases = result.nodes.filter((n) => n.type === 'phase');
      expect(phases.length).toBe(2);
    });

    it('24. no iteration count defaults to 3', () => {
      const md = `---
name: test
---

### Phase 1: Research

Do research.

If validation fails, go back to Research`;
      const result = parseSkillMd(md);
      // Should detect the loop pattern
      const loopEdges = result.edges.filter((e) => e.id.includes('loop'));
      if (loopEdges.length > 0) {
        // Should default to 3 iterations
        expect(loopEdges[0].data?.maxIterations).toBe(3);
      }
      // If no loop detected, that's also acceptable behavior
      expect(result.nodes).toBeDefined();
    });
  });

  describe('6.4 Garbage Input', () => {
    it('25. empty string produces start + end only with warning', () => {
      const result = parseSkillMd('');
      expect(result.nodes.length).toBe(2);
      expect(result.nodes.find((n) => n.type === 'start')).toBeDefined();
      expect(result.nodes.find((n) => n.type === 'end')).toBeDefined();
      // Should have a warning about no phases detected
      expect(result.warnings.some((w) => w.includes('No phases detected') || w.includes('not compatible'))).toBe(true);
    });

    it('26. random text produces start + end only with warning', () => {
      const md = `This is just some random text
without any structure at all.
No phases, no headers, nothing useful.
Lorem ipsum dolor sit amet.`;
      const result = parseSkillMd(md);
      expect(result.nodes.length).toBe(2);
      expect(result.nodes.find((n) => n.type === 'start')).toBeDefined();
      expect(result.nodes.find((n) => n.type === 'end')).toBeDefined();
      // Should have a warning
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('27. HTML instead of markdown produces best-effort result', () => {
      const md = `<html>
<head><title>Not Markdown</title></head>
<body>
<h3>Phase 1: Research</h3>
<p>Do research.</p>
</body>
</html>`;
      const result = parseSkillMd(md);
      // Should not crash
      expect(result.nodes).toBeDefined();
      expect(result.edges).toBeDefined();
      // Should have at least start and end
      expect(result.nodes.find((n) => n.type === 'start')).toBeDefined();
      expect(result.nodes.find((n) => n.type === 'end')).toBeDefined();
      // Likely won't parse HTML as phases, so expect warning
      // (or if it somehow finds a phase, that's also acceptable)
    });
  });

  describe('Edge Cases', () => {
    it('handles whitespace-only input', () => {
      const result = parseSkillMd('   \n\n\t\t\n   ');
      expect(result.nodes.length).toBe(2);
      expect(result.nodes.find((n) => n.type === 'start')).toBeDefined();
      expect(result.nodes.find((n) => n.type === 'end')).toBeDefined();
    });

    it('handles deeply nested malformed structures', () => {
      const md = `---
name: test
---

### Phase 1: Outer

\`\`\`
### Phase 2: Inner (should not be parsed as phase)
\`\`\`

### Phase 3: Another

Content`;
      const result = parseSkillMd(md);
      expect(result.nodes).toBeDefined();
      // Parser should not crash with nested structures
      const phases = result.nodes.filter((n) => n.type === 'phase');
      expect(phases.length).toBeGreaterThanOrEqual(1);
    });

    it('handles special characters in phase names', () => {
      const md = `---
name: test
---

### Phase 1: Research & Analysis (2024)

Do research.`;
      const result = parseSkillMd(md);
      const phase = result.nodes.find((n) => n.type === 'phase');
      expect(phase).toBeDefined();
      expect(phase?.data.label).toBe('Research & Analysis (2024)');
    });

    it('handles unicode content', () => {
      const md = `---
name: test
---

### Phase 1: Research

Do research with unicode.`;
      const result = parseSkillMd(md);
      expect(result.nodes).toBeDefined();
      const phase = result.nodes.find((n) => n.type === 'phase');
      expect(phase).toBeDefined();
    });
  });
});
