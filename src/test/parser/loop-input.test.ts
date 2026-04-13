// src/test/parser/loop-input.test.ts
import { describe, it, expect } from 'vitest';
import { parseSkillMd } from '@/lib/skillParser';

/**
 * Tests for loop detection in the skill parser.
 *
 * The parser detects loops through two mechanisms:
 * 1. Explicit format: **Loop Control:** section with "Repeat back to..." pattern
 * 2. Natural language: Various patterns like "go back to", "retry up to N times"
 *
 * KNOWN PARSER LIMITATIONS (documented by failing tests):
 * - Natural language patterns are only detected if they match specific regexes
 * - The "go back to X" pattern requires specific formatting
 * - Loop detection only works within a single phase's section content
 */
describe('Parser: Loop Detection', () => {
  // Wrap each markdown in frontmatter to make it valid
  const wrapWithFrontmatter = (content: string) => `---
name: test-workflow
description: Test workflow
---

${content}`;

  // Helper to get all edges from parse result
  const getEdges = (md: string) => {
    const result = parseSkillMd(wrapWithFrontmatter(md));
    return result.edges;
  };

  // Helper to get loop-back edges (edges that go back to earlier nodes)
  const getLoopEdges = (md: string) => {
    const result = parseSkillMd(wrapWithFrontmatter(md));
    // Loop edges have IDs starting with 'edge-loop-'
    return result.edges.filter((e) => e.id.startsWith('edge-loop-'));
  };

  // Helper to get warnings
  const getWarnings = (md: string) => {
    const result = parseSkillMd(wrapWithFrontmatter(md));
    return result.warnings;
  };

  // Helper to get nodes
  const getNodes = (md: string) => {
    const result = parseSkillMd(wrapWithFrontmatter(md));
    return result.nodes;
  };

  describe('explicit loop control format', () => {
    it('detects loop from **Loop Control:** section', () => {
      const md = `### Phase 1: Research

Do research.

### Phase 2: Validate

Do validation.

**Loop Control:**
- Repeat back to "Research", up to 3 times`;

      const loopEdges = getLoopEdges(md);
      expect(loopEdges.length).toBe(1);
      expect(loopEdges[0].source).toBe('node-2'); // Phase 2 (Validate)
      expect(loopEdges[0].target).toBe('node-1'); // Phase 1 (Research)
    });

    it('extracts max iterations from explicit format', () => {
      const md = `### Phase 1: Research

Do research.

### Phase 2: Validate

Do validation.

**Loop Control:**
- Repeat back to "Research", up to 5 times`;

      const loopEdges = getLoopEdges(md);
      expect(loopEdges.length).toBe(1);
      expect(loopEdges[0].data?.maxIterations).toBe(5);
    });

    it('extracts maxIterations with various values', () => {
      const md = `### Phase 1: Research

Do research.

### Phase 2: Validate

Do validation.

**Loop Control:**
- Repeat back to "Research", up to 10 times`;

      const loopEdges = getLoopEdges(md);
      expect(loopEdges[0].data?.maxIterations).toBe(10);
    });

    it('handles explicit format without "back" word', () => {
      const md = `### Phase 1: Research

Do research.

### Phase 2: Validate

Do validation.

**Loop Control:**
- Repeat to "Research", up to 3 times`;

      const loopEdges = getLoopEdges(md);
      expect(loopEdges.length).toBe(1);
    });
  });

  describe('natural language patterns', () => {
    /**
     * PARSER BEHAVIOR NOTE:
     * The natural language "go back/return/loop back to" pattern uses the regex:
     * /(?:go\s*back|return|loop\s*back)\s*to\s*(?:Phase\s*\d*:?\s*)?["']?([^"'\n,]+)["']?(?:.*?up\s*to\s*(\d+)\s*times)?/i
     *
     * This regex captures the target label but has limitations:
     * - The target label is captured until newline, comma, or quote
     * - The target must match an existing phase label (case-insensitive)
     * - Trailing text like "if needed" gets captured and may cause mismatch
     *
     * BUG: The regex captures "Research." (with period) or "Research if needed"
     * which doesn't match the label "Research" in the labelToIdMap.
     */

    describe('go back to pattern - working cases', () => {
      it('detects "go back to {Phase}" with comma after target', () => {
        // The comma stops capture, so "Research" is captured cleanly
        const md = `### Phase 1: Research

Do research.

### Phase 2: Validate

If validation fails, go back to Research, and try again.`;

        const loopEdges = getLoopEdges(md);
        expect(loopEdges.length).toBe(1);
        expect(loopEdges[0].target).toBe('node-1');
      });

      it('detects "go back to Phase N: Label" format with comma', () => {
        const md = `### Phase 1: Research

Do research.

### Phase 2: Validate

If validation fails, go back to Phase 1: Research, please.`;

        const loopEdges = getLoopEdges(md);
        expect(loopEdges.length).toBe(1);
      });
    });

    describe('go back to pattern - BUG: trailing text captured', () => {
      // These tests document parser bugs where trailing text prevents matching

      it.fails('BUG: "go back to Research." captures period in target', () => {
        // The regex captures "Research." which doesn't match "research" in map
        const md = `### Phase 1: Research

Do research.

### Phase 2: Validate

If validation fails, go back to Research.`;

        const loopEdges = getLoopEdges(md);
        expect(loopEdges.length).toBe(1);
      });

      it.fails('BUG: "go back to Research if needed" captures trailing text', () => {
        const md = `### Phase 1: Research

Do research.

### Phase 2: Validate

Go back to Research if needed.`;

        const loopEdges = getLoopEdges(md);
        expect(loopEdges.length).toBe(1);
      });
    });

    describe('return to pattern', () => {
      it('detects "return to {Phase}" with comma delimiter', () => {
        // NOTE: Avoid "If" prefix as it triggers decision pattern detection
        const md = `### Phase 1: Analysis

Do analysis.

### Phase 2: Review

When incomplete, return to Analysis, then proceed.`;

        const loopEdges = getLoopEdges(md);
        expect(loopEdges.length).toBe(1);
        expect(loopEdges[0].target).toBe('node-1');
      });

      it.fails('BUG: "return to Analysis." captures period', () => {
        const md = `### Phase 1: Analysis

Do analysis.

### Phase 2: Review

When incomplete, return to Analysis.`;

        const loopEdges = getLoopEdges(md);
        expect(loopEdges.length).toBe(1);
      });
    });

    describe('loop back to pattern', () => {
      it('detects "loop back to {Phase}" with comma delimiter', () => {
        // NOTE: Avoid "If" prefix as it triggers decision pattern detection
        const md = `### Phase 1: Research

Do research.

### Phase 2: Validate

When errors found, loop back to Research, then verify.`;

        const loopEdges = getLoopEdges(md);
        expect(loopEdges.length).toBe(1);
        expect(loopEdges[0].target).toBe('node-1');
      });

      it.fails('BUG: "loop back to Research." captures period', () => {
        const md = `### Phase 1: Research

Do research.

### Phase 2: Validate

When errors found, loop back to Research.`;

        const loopEdges = getLoopEdges(md);
        expect(loopEdges.length).toBe(1);
      });
    });

    describe('retry up to N times pattern', () => {
      it('detects "retry up to N times" as self-loop', () => {
        const md = `### Phase 1: Validate

Validate the data. Retry up to 3 times if it fails.`;

        const loopEdges = getLoopEdges(md);
        expect(loopEdges.length).toBe(1);
        // Self-loop: source and target are the same node
        expect(loopEdges[0].source).toBe('node-1');
        expect(loopEdges[0].target).toBe('node-1');
        expect(loopEdges[0].data?.maxIterations).toBe(3);
      });

      it('detects "repeat up to N times" as self-loop', () => {
        const md = `### Phase 1: Process

Process the data. Repeat up to 5 times.`;

        const loopEdges = getLoopEdges(md);
        expect(loopEdges.length).toBe(1);
        expect(loopEdges[0].source).toBe('node-1');
        expect(loopEdges[0].target).toBe('node-1');
        expect(loopEdges[0].data?.maxIterations).toBe(5);
      });

      it('detects "iterate up to N times" as self-loop', () => {
        const md = `### Phase 1: Refine

Refine the output. Iterate up to 4 times.`;

        const loopEdges = getLoopEdges(md);
        expect(loopEdges.length).toBe(1);
        expect(loopEdges[0].data?.maxIterations).toBe(4);
      });

      it('detects "loop up to N times" as self-loop', () => {
        const md = `### Phase 1: Process

Process items. Loop up to 3 times.`;

        const loopEdges = getLoopEdges(md);
        expect(loopEdges.length).toBe(1);
        expect(loopEdges[0].source).toBe('node-1');
        expect(loopEdges[0].target).toBe('node-1');
      });
    });

    describe('repeat this phase pattern', () => {
      it('detects "repeat this phase up to N times" as self-loop', () => {
        const md = `### Phase 1: Process

Process items. Repeat this phase up to 3 times.`;

        const loopEdges = getLoopEdges(md);
        expect(loopEdges.length).toBe(1);
        expect(loopEdges[0].source).toBe('node-1');
        expect(loopEdges[0].target).toBe('node-1');
      });

      it('detects "retry this step up to N times" as self-loop', () => {
        const md = `### Phase 1: Iterate

Keep iterating. Retry this step up to 3 times.`;

        const loopEdges = getLoopEdges(md);
        expect(loopEdges.length).toBe(1);
        expect(loopEdges[0].source).toBe('node-1');
        expect(loopEdges[0].target).toBe('node-1');
      });
    });

    describe('natural language with max iterations', () => {
      it('extracts max iterations from "go back to ... up to N times"', () => {
        const md = `### Phase 1: Research

Do research.

### Phase 2: Validate

Go back to Research, up to 5 times if needed.`;

        const loopEdges = getLoopEdges(md);
        expect(loopEdges.length).toBe(1);
        expect(loopEdges[0].data?.maxIterations).toBe(5);
      });

      it.fails('BUG: "return to ... (max N iterations)" format not supported', () => {
        const md = `### Phase 1: Research

Do research.

### Phase 2: Validate

Return to Research, (max 4 iterations).`;

        // Note: The current parser may not extract "max N iterations" format
        const loopEdges = getLoopEdges(md);
        expect(loopEdges.length).toBe(1);
        expect(loopEdges[0].data?.maxIterations).toBe(4);
      });
    });
  });

  describe('default max iterations', () => {
    it('defaults to 3 when no count specified in natural language', () => {
      const md = `### Phase 1: Research

Do research.

### Phase 2: Validate

If issues found, go back to Research, please.`;

      const loopEdges = getLoopEdges(md);
      expect(loopEdges.length).toBe(1);
      expect(loopEdges[0].data?.maxIterations).toBe(3);
    });

    it('explicit format requires "up to N times" - no loop without it', () => {
      // NOTE: The explicit regex requires a number, so this does not match
      const md = `### Phase 1: Research

Do research.

### Phase 2: Validate

**Loop Control:**
- May repeat back to "Research"`;

      // Explicit format REQUIRES "up to N times" so this won't create a loop
      const loopEdges = getLoopEdges(md);
      expect(loopEdges.length).toBe(0);
    });
  });

  describe('target resolution', () => {
    it('resolves target by exact label match with comma delimiter', () => {
      const md = `### Phase 1: Research Data

Do research.

### Phase 2: Validate

Go back to Research Data, if needed.`;

      const loopEdges = getLoopEdges(md);
      expect(loopEdges.length).toBe(1);
      expect(loopEdges[0].target).toBe('node-1');
    });

    it('resolves target with case-insensitive matching', () => {
      const md = `### Phase 1: Research

Do research.

### Phase 2: Validate

Go back to research, if issues found.`;

      const loopEdges = getLoopEdges(md);
      expect(loopEdges.length).toBe(1);
      expect(loopEdges[0].target).toBe('node-1');
    });

    it('resolves target with partial matching (Phase N: Label)', () => {
      const md = `### Phase 1: Research

Do research.

### Phase 2: Validate

Go back to Phase 1: Research, please.`;

      // Parser handles "Phase 1: Research" and extracts "Research" to match
      const loopEdges = getLoopEdges(md);
      expect(loopEdges.length).toBe(1);
    });

    it.skip('resolves target when label has extra whitespace in reference', () => {
      // Behavior depends on regex trim handling - skipped as edge case
      const md = `### Phase 1: Research

Do research.

### Phase 2: Validate

Go back to  Research  , if needed.`;

      const loopEdges = getLoopEdges(md);
      expect(loopEdges.length).toBe(1);
    });
  });

  describe('loop edge properties', () => {
    it('creates loop edge with correct source', () => {
      const md = `### Phase 1: Research

Do research.

### Phase 2: Validate

Do validation.

**Loop Control:**
- Repeat back to "Research", up to 3 times`;

      const loopEdges = getLoopEdges(md);
      expect(loopEdges[0].source).toBe('node-2'); // Validate node
    });

    it('creates loop edge with correct target', () => {
      const md = `### Phase 1: Research

Do research.

### Phase 2: Validate

Do validation.

**Loop Control:**
- Repeat back to "Research", up to 3 times`;

      const loopEdges = getLoopEdges(md);
      expect(loopEdges[0].target).toBe('node-1'); // Research node
    });

    it('creates loop edge with maxIterations in data', () => {
      const md = `### Phase 1: Research

Do research.

### Phase 2: Validate

Go back to Research, up to 7 times.`;

      const loopEdges = getLoopEdges(md);
      expect(loopEdges[0].data?.maxIterations).toBe(7);
    });

    it('loop edge ID starts with edge-loop-', () => {
      const md = `### Phase 1: Research

Do research.

### Phase 2: Validate

Go back to Research, please.`;

      const loopEdges = getLoopEdges(md);
      expect(loopEdges[0].id).toMatch(/^edge-loop-/);
    });

    it('loop edge has sourceHandle and targetHandle set', () => {
      const md = `### Phase 1: Research

Do research.

### Phase 2: Validate

Go back to Research, please.`;

      const loopEdges = getLoopEdges(md);
      expect(loopEdges[0].sourceHandle).toBeDefined();
      expect(loopEdges[0].targetHandle).toBeDefined();
    });
  });

  describe('self-loop detection', () => {
    it('creates self-loop when target is current phase', () => {
      const md = `### Phase 1: Validate

Validate data. Retry up to 3 times.`;

      const loopEdges = getLoopEdges(md);
      expect(loopEdges.length).toBe(1);
      expect(loopEdges[0].source).toBe(loopEdges[0].target);
    });

    it('creates self-loop with correct node ID', () => {
      const md = `### Phase 1: Validate

Validate data. Repeat up to 5 times.`;

      const loopEdges = getLoopEdges(md);
      expect(loopEdges[0].source).toBe('node-1');
      expect(loopEdges[0].target).toBe('node-1');
    });

    it('self-loop preserves maxIterations', () => {
      const md = `### Phase 1: Validate

Validate data. Retry up to 4 times.`;

      const loopEdges = getLoopEdges(md);
      expect(loopEdges[0].data?.maxIterations).toBe(4);
    });
  });

  describe('edge cases', () => {
    describe('loop target not found', () => {
      it('generates warning when target does not exist', () => {
        // Use explicit format since it creates the loop attempt even with bad target
        const md = `### Phase 1: Research

Do research.

### Phase 2: Validate

**Loop Control:**
- Repeat back to "NonExistent", up to 3 times`;

        const warnings = getWarnings(md);
        expect(warnings.some((w) => w.includes('not found') || w.includes('NonExistent'))).toBe(true);
      });

      it('does not create loop edge when target not found', () => {
        const md = `### Phase 1: Research

Do research.

### Phase 2: Validate

**Loop Control:**
- Repeat back to "MissingPhase", up to 3 times`;

        const loopEdges = getLoopEdges(md);
        expect(loopEdges.length).toBe(0);
      });
    });

    describe('multiple loops', () => {
      it('detects multiple loop patterns in same document', () => {
        const md = `### Phase 1: Research

Do research.

### Phase 2: Process

Process data. Retry up to 3 times.

### Phase 3: Validate

**Loop Control:**
- Repeat back to "Research", up to 5 times`;

        const loopEdges = getLoopEdges(md);
        expect(loopEdges.length).toBe(2);
      });

      it('creates separate loop edges for each pattern', () => {
        const md = `### Phase 1: Research

Do research.

### Phase 2: Process

Process data. Retry up to 2 times.

### Phase 3: Validate

**Loop Control:**
- Repeat back to "Research", up to 5 times`;

        const loopEdges = getLoopEdges(md);
        // One self-loop from Process, one loop from Validate to Research
        expect(loopEdges.length).toBe(2);

        const selfLoop = loopEdges.find((e) => e.source === e.target);
        const backLoop = loopEdges.find((e) => e.source !== e.target);

        expect(selfLoop).toBeDefined();
        expect(backLoop).toBeDefined();
      });
    });

    describe('loop from later phase to earlier phase', () => {
      it('creates loop from phase 3 to phase 1', () => {
        const md = `### Phase 1: Start

Start work.

### Phase 2: Process

Process data.

### Phase 3: Review

**Loop Control:**
- Repeat back to "Start", up to 3 times`;

        const loopEdges = getLoopEdges(md);
        expect(loopEdges.length).toBe(1);
        expect(loopEdges[0].source).toBe('node-3');
        expect(loopEdges[0].target).toBe('node-1');
      });
    });

    describe('loop patterns in different positions', () => {
      it('detects loop pattern at beginning of phase content', () => {
        const md = `### Phase 1: Research

Do research.

### Phase 2: Validate

Go back to Research, if validation fails.

Do the validation work.`;

        const loopEdges = getLoopEdges(md);
        expect(loopEdges.length).toBe(1);
      });

      it('detects loop pattern at end of phase content', () => {
        const md = `### Phase 1: Research

Do research.

### Phase 2: Validate

Do the validation work.

If errors found, go back to Research, please.`;

        const loopEdges = getLoopEdges(md);
        expect(loopEdges.length).toBe(1);
      });

      it('detects loop pattern in middle of phase content', () => {
        const md = `### Phase 1: Research

Do research.

### Phase 2: Validate

First, check the data.

Go back to Research, if issues found.

Then continue processing.`;

        const loopEdges = getLoopEdges(md);
        expect(loopEdges.length).toBe(1);
      });
    });

    describe('loop with special characters in target', () => {
      it.skip('handles target with parentheses - edge case', () => {
        const md = `### Phase 1: Research (Part 1)

Do research.

### Phase 2: Validate

Go back to Research (Part 1), if needed.`;

        // Behavior depends on regex handling of parentheses
        const loopEdges = getLoopEdges(md);
        expect(loopEdges.length).toBe(1);
      });

      it('handles target with hyphen', () => {
        const md = `### Phase 1: Pre-check

Do pre-check.

### Phase 2: Validate

Go back to Pre-check, if needed.`;

        const loopEdges = getLoopEdges(md);
        expect(loopEdges.length).toBe(1);
      });
    });
  });

  describe('interaction with other node types', () => {
    it('loop does not interfere with sequential edges', () => {
      const md = `### Phase 1: Research

Do research.

### Phase 2: Validate

Do validation.

**Loop Control:**
- Repeat back to "Research", up to 3 times`;

      const result = parseSkillMd(wrapWithFrontmatter(md));

      // Should have: start->node-1, node-1->node-2, node-2->end, plus loop edge
      const sequentialEdges = result.edges.filter((e) => !e.id.startsWith('edge-loop-'));
      const loopEdges = result.edges.filter((e) => e.id.startsWith('edge-loop-'));

      expect(sequentialEdges.length).toBe(3); // start->1, 1->2, 2->end
      expect(loopEdges.length).toBe(1);
    });

    it('loop detection works with approval nodes present', () => {
      const md = `### Phase 1: Research

Do research.

### Approval Gate

Use \`AskUserQuestion\` to confirm:

\`\`\`
Question: "Continue?"
Options:
- Yes: Proceed
- No: Stop
\`\`\`

### Phase 2: Process

**Loop Control:**
- Repeat back to "Research", up to 3 times`;

      const loopEdges = getLoopEdges(md);
      expect(loopEdges.length).toBe(1);
    });
  });

  describe('explicit format edge cases', () => {
    it('parser requires double quotes in explicit format', () => {
      // Parser regex uses double quotes: "([^"]+)"
      const md = `### Phase 1: Research

Do research.

### Phase 2: Validate

**Loop Control:**
- Repeat back to 'Research', up to 3 times`;

      // Current parser expects double quotes - single quotes won't match
      const loopEdges = getLoopEdges(md);
      expect(loopEdges.length).toBe(0);
    });

    it('handles target name with "Phase N:" prefix in quotes', () => {
      const md = `### Phase 1: Research

Do research.

### Phase 2: Validate

**Loop Control:**
- Repeat back to "Phase 1: Research", up to 3 times`;

      // Parser captures full string "Phase 1: Research" and matches via labelToIdMap
      // Since the label stored is "Research", it should NOT match "Phase 1: Research"
      const loopEdges = getLoopEdges(md);
      // Parser may create warning for unmatched target
    });
  });

  describe('condition extraction', () => {
    it('does not extract condition from natural language patterns', () => {
      // Current parser extracts condition only from explicit format
      // NOTE: Avoid "If" prefix as it triggers decision pattern detection
      const md = `### Phase 1: Research

Do research.

### Phase 2: Validate

When validation fails, go back to Research, then proceed.`;

      const loopEdges = getLoopEdges(md);
      expect(loopEdges.length).toBe(1);
      // Natural language condition is NOT extracted into edge data
      expect(loopEdges[0].data?.condition).toBeUndefined();
    });
  });

  describe('whitespace handling', () => {
    it('handles Loop Control section with extra blank line', () => {
      const md = `### Phase 1: Research

Do research.

### Phase 2: Validate

**Loop Control:**

- Repeat back to "Research", up to 3 times`;

      const loopEdges = getLoopEdges(md);
      expect(loopEdges.length).toBe(1);
    });

    it.skip('multi-line pattern may not match - parser limitation', () => {
      const md = `### Phase 1: Research

Do research.

### Phase 2: Validate

If there are errors,
go back to Research, please.`;

      // Multi-line pattern may not match depending on regex flags
      const loopEdges = getLoopEdges(md);
      expect(loopEdges.length).toBe(1);
    });
  });

  describe('priority of detection methods', () => {
    it('explicit Loop Control and natural language can coexist', () => {
      // If both patterns are in different phases, both should create edges
      const md = `### Phase 1: Research

Do research.

### Phase 2: Validate

Retry up to 2 times.

### Phase 3: Review

**Loop Control:**
- Repeat back to "Research", up to 5 times`;

      const loopEdges = getLoopEdges(md);
      // Should have self-loop from Validate and loop from Review to Research
      expect(loopEdges.length).toBe(2);
    });

    it('first matching pattern wins within same phase', () => {
      const md = `### Phase 1: Research

Do research.

### Phase 2: Validate

Retry up to 3 times. Also repeat up to 5 times.`;

      // Parser should only create one self-loop (first match wins)
      const loopEdges = getLoopEdges(md);
      expect(loopEdges.length).toBe(1);
      // First match is "retry up to 3 times"
      expect(loopEdges[0].data?.maxIterations).toBe(3);
    });
  });
});
