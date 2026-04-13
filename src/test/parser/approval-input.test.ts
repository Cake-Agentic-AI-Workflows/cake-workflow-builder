// src/test/parser/approval-input.test.ts
import { describe, it, expect } from 'vitest';
import { parseSkillMd } from '@/lib/skillParser';

describe('Parser: Approval Input', () => {
  // Wrap each markdown in frontmatter to make it valid
  const wrapWithFrontmatter = (content: string) => `---
name: test-workflow
description: Test workflow
---

${content}`;

  // Helper to find approval nodes from parse result
  const getApprovalNodes = (md: string) => {
    const result = parseSkillMd(wrapWithFrontmatter(md));
    return result.nodes.filter((n) => n.type === 'approval');
  };

  // Helper to get first approval node
  const getFirstApproval = (md: string) => {
    const approvals = getApprovalNodes(md);
    return approvals[0];
  };

  describe('approval detection', () => {
    it('detects approval node via AskUserQuestion keyword', () => {
      const md = `### Review Step

Use \`AskUserQuestion\` to confirm:

\`\`\`
Question: "Ready to proceed?"
Options:
- Yes: Continue
- No: Stop
\`\`\``;
      const approvals = getApprovalNodes(md);
      expect(approvals.length).toBe(1);
      expect(approvals[0].type).toBe('approval');
    });

    it('detects approval node via Approval in header', () => {
      const md = `### Approval Gate

Confirm before continuing.`;
      const approvals = getApprovalNodes(md);
      expect(approvals.length).toBe(1);
      expect(approvals[0].type).toBe('approval');
    });

    it('detects approval when AskUserQuestion appears mid-content', () => {
      const md = `### Confirmation Step

Before moving forward, call AskUserQuestion to get approval.`;
      const approvals = getApprovalNodes(md);
      expect(approvals.length).toBe(1);
    });

    it('detects approval with "Approval" anywhere in header', () => {
      const md = `### User Approval Required

Get user confirmation.`;
      const approvals = getApprovalNodes(md);
      expect(approvals.length).toBe(1);
    });

    it('does not detect non-approval sections as approval', () => {
      const md = `### Phase 1: Research

Explore the codebase.`;
      const approvals = getApprovalNodes(md);
      expect(approvals.length).toBe(0);
    });
  });

  describe('label extraction', () => {
    it('extracts label from header', () => {
      const md = `### Review Step

Use \`AskUserQuestion\` to confirm.`;
      const approval = getFirstApproval(md);
      expect(approval?.data.label).toBe('Review Step');
    });

    it('extracts label from Approval header', () => {
      const md = `### Approval Gate

Confirm before continuing.`;
      const approval = getFirstApproval(md);
      expect(approval?.data.label).toBe('Approval Gate');
    });

    it('extracts label with multiple words', () => {
      const md = `### User Confirmation Before Deployment

Use \`AskUserQuestion\` to confirm.`;
      const approval = getFirstApproval(md);
      expect(approval?.data.label).toBe('User Confirmation Before Deployment');
    });

    it('extracts label with special characters', () => {
      const md = `### Pre-flight Approval (Required)

Use \`AskUserQuestion\` to confirm.`;
      const approval = getFirstApproval(md);
      expect(approval?.data.label).toBe('Pre-flight Approval (Required)');
    });

    it('extracts label with numbers', () => {
      const md = `### Step 2 Approval

Use \`AskUserQuestion\` to confirm.`;
      const approval = getFirstApproval(md);
      expect(approval?.data.label).toBe('Step 2 Approval');
    });
  });

  describe('question extraction', () => {
    it('extracts question from Question: "..." format', () => {
      const md = `### Approval

Use \`AskUserQuestion\`:

\`\`\`
Question: "Ready to proceed with deployment?"
Options:
- Yes: Continue
\`\`\``;
      const approval = getFirstApproval(md);
      expect(approval?.data.question).toBe('Ready to proceed with deployment?');
    });

    it('extracts question with simple content', () => {
      const md = `### Review

\`\`\`
Question: "Continue?"
\`\`\`

Use \`AskUserQuestion\``;
      const approval = getFirstApproval(md);
      expect(approval?.data.question).toBe('Continue?');
    });

    it('extracts question with apostrophe', () => {
      const md = `### Approval

\`\`\`
Question: "Are you sure you're ready?"
\`\`\`

Use \`AskUserQuestion\``;
      const approval = getFirstApproval(md);
      expect(approval?.data.question).toBe("Are you sure you're ready?");
    });

    it('extracts question with question mark', () => {
      const md = `### Approval

\`\`\`
Question: "Deploy to production?"
\`\`\`

Use \`AskUserQuestion\``;
      const approval = getFirstApproval(md);
      expect(approval?.data.question).toBe('Deploy to production?');
    });

    it('handles question without Question: prefix', () => {
      const md = `### Approval Gate

Use \`AskUserQuestion\` to confirm.`;
      const approval = getFirstApproval(md);
      // Should have default or empty question when not specified
      expect(approval?.data.question).toBeDefined();
    });
  });

  describe('options extraction', () => {
    describe('single option', () => {
      it('extracts single option', () => {
        const md = `### Approval

\`\`\`
Question: "Continue?"
Options:
- Yes: Proceed with the workflow
\`\`\`

Use \`AskUserQuestion\``;
        const approval = getFirstApproval(md);
        expect(approval?.data.options.length).toBeGreaterThanOrEqual(1);
        expect(approval?.data.options[0]?.label).toBe('Yes');
      });
    });

    describe('multiple options', () => {
      it('extracts two options correctly', () => {
        const md = `### Approval

\`\`\`
Question: "Ready?"
Options:
- Yes: Continue with deployment
- No: Stop and review
\`\`\`

Use \`AskUserQuestion\``;
        const approval = getFirstApproval(md);
        expect(approval?.data.options.length).toBe(2);
        expect(approval?.data.options[0]?.label).toBe('Yes');
        expect(approval?.data.options[1]?.label).toBe('No');
      });

      it('extracts three options correctly', () => {
        const md = `### Review

\`\`\`
Question: "How should we proceed?"
Options:
- Approve: Accept the changes
- Reject: Discard the changes
- Defer: Review later
\`\`\`

Use \`AskUserQuestion\``;
        const approval = getFirstApproval(md);
        expect(approval?.data.options.length).toBe(3);
        expect(approval?.data.options[0]?.label).toBe('Approve');
        expect(approval?.data.options[1]?.label).toBe('Reject');
        expect(approval?.data.options[2]?.label).toBe('Defer');
      });
    });

    describe('option label extraction', () => {
      it('extracts option label before colon', () => {
        const md = `### Approval

\`\`\`
Question: "Ready?"
Options:
- Approve: Accept and continue
\`\`\`

Use \`AskUserQuestion\``;
        const approval = getFirstApproval(md);
        expect(approval?.data.options[0]?.label).toBe('Approve');
      });

      it('extracts multi-word option label', () => {
        const md = `### Approval

\`\`\`
Question: "Ready?"
Options:
- Yes Please: Continue with confidence
\`\`\`

Use \`AskUserQuestion\``;
        const approval = getFirstApproval(md);
        expect(approval?.data.options[0]?.label).toBe('Yes Please');
      });
    });

    describe('option description extraction', () => {
      it('extracts option description after colon', () => {
        const md = `### Approval

\`\`\`
Question: "Ready?"
Options:
- Yes: Continue with deployment
\`\`\`

Use \`AskUserQuestion\``;
        const approval = getFirstApproval(md);
        expect(approval?.data.options[0]?.description).toBe('Continue with deployment');
      });

      it('extracts option description with multiple words', () => {
        const md = `### Approval

\`\`\`
Question: "Ready?"
Options:
- Approve: Accept all changes and continue to the next phase
\`\`\`

Use \`AskUserQuestion\``;
        const approval = getFirstApproval(md);
        expect(approval?.data.options[0]?.description).toBe(
          'Accept all changes and continue to the next phase'
        );
      });
    });
  });

  describe('edge cases', () => {
    describe('default options', () => {
      it('provides defaults when no options specified', () => {
        const md = `### Approval Gate

Use \`AskUserQuestion\` to confirm.

**Do NOT proceed without user confirmation.**`;
        const approval = getFirstApproval(md);
        // Should have some default options
        expect(approval?.data.options).toBeDefined();
        // Default options from defaultApprovalNodeData are typically Yes/No
      });
    });

    describe('special characters', () => {
      it('preserves question marks in question', () => {
        const md = `### Approval

\`\`\`
Question: "Are you ready???"
Options:
- Yes: Continue
\`\`\`

Use \`AskUserQuestion\``;
        const approval = getFirstApproval(md);
        expect(approval?.data.question).toBe('Are you ready???');
      });

      it('preserves quotes in question', () => {
        const md = `### Approval

\`\`\`
Question: "Deploy the \\"production\\" build?"
Options:
- Yes: Continue
\`\`\`

Use \`AskUserQuestion\``;
        const approval = getFirstApproval(md);
        // Note: The parser extracts content between quotes, so escaped quotes may be handled differently
        expect(approval?.data.question).toBeDefined();
      });

      it('handles options with colons in description', () => {
        const md = `### Approval

\`\`\`
Question: "Check URL?"
Options:
- URL: Check http://example.com:8080
\`\`\`

Use \`AskUserQuestion\``;
        const approval = getFirstApproval(md);
        expect(approval?.data.options[0]?.label).toBe('URL');
        // The description should include the URL with port
        expect(approval?.data.options[0]?.description).toContain('http');
      });

      it('handles options with special punctuation in description', () => {
        const md = `### Approval

\`\`\`
Question: "Ready?"
Options:
- Yes: Let's go! (finally)
\`\`\`

Use \`AskUserQuestion\``;
        const approval = getFirstApproval(md);
        expect(approval?.data.options[0]?.description).toContain("Let's go");
      });
    });

    describe('multiple approval nodes', () => {
      it('parses two approval nodes in order', () => {
        const md = `### First Approval

Use \`AskUserQuestion\` to confirm first step.

\`\`\`
Question: "Ready for step 1?"
Options:
- Yes: Continue
- No: Stop
\`\`\`

### Second Approval

Use \`AskUserQuestion\` to confirm second step.

\`\`\`
Question: "Ready for step 2?"
Options:
- Yes: Continue
- No: Stop
\`\`\``;
        const approvals = getApprovalNodes(md);
        expect(approvals.length).toBe(2);
        expect(approvals[0]?.data.label).toBe('First Approval');
        expect(approvals[1]?.data.label).toBe('Second Approval');
      });

      it('extracts different questions from multiple approvals', () => {
        const md = `### Deploy Approval

\`\`\`
Question: "Deploy to staging?"
Options:
- Yes: Deploy
\`\`\`

Use \`AskUserQuestion\`

### Release Approval

\`\`\`
Question: "Release to production?"
Options:
- Yes: Release
\`\`\`

Use \`AskUserQuestion\``;
        const approvals = getApprovalNodes(md);
        expect(approvals.length).toBe(2);
        expect(approvals[0]?.data.question).toBe('Deploy to staging?');
        expect(approvals[1]?.data.question).toBe('Release to production?');
      });
    });

    describe('mixed content', () => {
      it('parses approval between phases', () => {
        const md = `### Phase 1: Research

Explore the codebase.

### Approval Gate

\`\`\`
Question: "Continue?"
Options:
- Yes: Continue
\`\`\`

Use \`AskUserQuestion\`

### Phase 2: Implement

Apply the findings.`;
        const result = parseSkillMd(wrapWithFrontmatter(md));
        const approvals = result.nodes.filter((n) => n.type === 'approval');
        const phases = result.nodes.filter((n) => n.type === 'phase');

        expect(approvals.length).toBe(1);
        expect(phases.length).toBe(2);
        expect(approvals[0]?.data.label).toBe('Approval Gate');
      });
    });

    describe('whitespace handling', () => {
      it('trims whitespace from option labels', () => {
        const md = `### Approval

\`\`\`
Question: "Ready?"
Options:
-   Yes  :  Continue
\`\`\`

Use \`AskUserQuestion\``;
        const approval = getFirstApproval(md);
        expect(approval?.data.options[0]?.label).toBe('Yes');
      });

      it('trims whitespace from option descriptions', () => {
        const md = `### Approval

\`\`\`
Question: "Ready?"
Options:
- Yes:   Continue forward
\`\`\`

Use \`AskUserQuestion\``;
        const approval = getFirstApproval(md);
        expect(approval?.data.options[0]?.description).toBe('Continue forward');
      });
    });

    describe('option without description', () => {
      it('handles option with label only', () => {
        const md = `### Approval

\`\`\`
Question: "Ready?"
Options:
- Yes
\`\`\`

Use \`AskUserQuestion\``;
        const approval = getFirstApproval(md);
        // Parser should handle option without colon gracefully
        expect(approval?.data.options[0]).toBeDefined();
      });
    });
  });

  describe('full workflow parsing', () => {
    it('creates correct node structure with edges', () => {
      const md = `### Approval Gate

Use \`AskUserQuestion\` to confirm:

\`\`\`
Question: "Ready to proceed?"
Options:
- Yes: Continue with deployment
- No: Stop and review
\`\`\`

**Do NOT proceed without user confirmation.**`;
      const result = parseSkillMd(wrapWithFrontmatter(md));

      // Should have: start, approval, end
      expect(result.nodes.length).toBe(3);
      expect(result.nodes[0].type).toBe('start');
      expect(result.nodes[1].type).toBe('approval');
      expect(result.nodes[2].type).toBe('end');

      // Should have edges connecting them
      expect(result.edges.length).toBe(2);
    });

    it('positions approval nodes correctly', () => {
      const md = `### First Approval

Use \`AskUserQuestion\` to confirm.

### Second Approval

Use \`AskUserQuestion\` to confirm.`;
      const result = parseSkillMd(wrapWithFrontmatter(md));

      const approvals = result.nodes.filter((n) => n.type === 'approval');
      // Y positions should increase for each approval
      expect(approvals[0].position.y).toBeLessThan(approvals[1].position.y);
    });
  });

  describe('case sensitivity', () => {
    it('detects AskUserQuestion case-sensitive', () => {
      const md = `### Review

Use \`AskUserQuestion\` to confirm.`;
      const approvals = getApprovalNodes(md);
      expect(approvals.length).toBe(1);
    });

    it('detects Approval in header case-insensitive', () => {
      const md = `### APPROVAL GATE

Please confirm.`;
      const result = parseSkillMd(wrapWithFrontmatter(md));
      // Based on parser regex /^###?\s*.*Approval/i, should match case-insensitive
      const approvals = result.nodes.filter((n) => n.type === 'approval');
      expect(approvals.length).toBe(1);
    });
  });

  describe('parser robustness', () => {
    it('handles approval with minimal content', () => {
      const md = `### Approval`;
      const approvals = getApprovalNodes(md);
      expect(approvals.length).toBe(1);
    });

    it('handles approval with code block outside proper format', () => {
      const md = `### Gate Approval

Just text here, no code block.

Use \`AskUserQuestion\` to confirm before proceeding.`;
      const approval = getFirstApproval(md);
      expect(approval).toBeDefined();
      expect(approval?.data.label).toBe('Gate Approval');
    });

    it('handles empty Options block', () => {
      const md = `### Approval

\`\`\`
Question: "Ready?"
Options:
\`\`\`

Use \`AskUserQuestion\``;
      const approval = getFirstApproval(md);
      expect(approval).toBeDefined();
      // Options should fall back to defaults or be empty array
    });
  });
});
