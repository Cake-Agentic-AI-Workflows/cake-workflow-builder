// src/test/parser/phase-input.test.ts
import { describe, it, expect } from 'vitest';
import { parseSkillMd } from '@/lib/skillParser';

describe('Parser: Phase Input', () => {
  // Wrap each markdown in frontmatter to make it valid
  const wrapWithFrontmatter = (content: string) => `---
name: test-workflow
description: Test workflow
---

${content}`;

  // Helper to find phase nodes from parse result
  const getPhaseNodes = (md: string) => {
    const result = parseSkillMd(wrapWithFrontmatter(md));
    return result.nodes.filter((n) => n.type === 'phase');
  };

  // Helper to get first phase node
  const getFirstPhase = (md: string) => {
    const phases = getPhaseNodes(md);
    return phases[0];
  };

  describe('label extraction', () => {
    it('extracts label from "Phase N: Label" format', () => {
      const md = `### Phase 1: Research Topic`;
      const phase = getFirstPhase(md);
      expect(phase?.data.label).toBe('Research Topic');
    });

    it('extracts label with multiple words', () => {
      const md = `### Phase 1: Analyze User Requirements and Constraints`;
      const phase = getFirstPhase(md);
      expect(phase?.data.label).toBe('Analyze User Requirements and Constraints');
    });

    it('extracts label with special characters', () => {
      const md = `### Phase 1: Code Review (Part 1)`;
      const phase = getFirstPhase(md);
      expect(phase?.data.label).toBe('Code Review (Part 1)');
    });

    it('extracts label with hyphen', () => {
      const md = `### Phase 1: Pre-flight Checks`;
      const phase = getFirstPhase(md);
      expect(phase?.data.label).toBe('Pre-flight Checks');
    });
  });

  describe('phase number variations', () => {
    it('parses "Phase 1:" format', () => {
      const md = `### Phase 1: First Step`;
      const phases = getPhaseNodes(md);
      expect(phases.length).toBe(1);
      expect(phases[0]?.data.label).toBe('First Step');
    });

    it('parses "Phase 2:" format', () => {
      const md = `### Phase 2: Second Step`;
      const phases = getPhaseNodes(md);
      expect(phases.length).toBe(1);
      expect(phases[0]?.data.label).toBe('Second Step');
    });

    it('parses "Phase:" without number', () => {
      const md = `### Phase: Unnamed Step`;
      const phases = getPhaseNodes(md);
      expect(phases.length).toBe(1);
      expect(phases[0]?.data.label).toBe('Unnamed Step');
    });

    // NOTE: The parser splits by ### headers only, so ## headers are not detected as sections.
    // This test documents the current behavior - h2 headers don't create sections.
    it('does NOT parse "## Phase 1:" with h2 header (parser limitation)', () => {
      const md = `## Phase 1: With H2`;
      const phases = getPhaseNodes(md);
      // Parser requires ### headers to split sections
      expect(phases.length).toBe(0);
    });

    it('parses phase with double-digit number', () => {
      const md = `### Phase 12: Late Stage`;
      const phases = getPhaseNodes(md);
      expect(phases.length).toBe(1);
      expect(phases[0]?.data.label).toBe('Late Stage');
    });
  });

  describe('agent configuration', () => {
    describe('agent type extraction', () => {
      it('extracts Explore agent type', () => {
        const md = `### Phase 1: Research

Use Agent tool with \`subagent_type: "Explore"\` and \`model: "sonnet"\`:`;
        const phase = getFirstPhase(md);
        expect(phase?.data.agent.type).toBe('Explore');
      });

      it('extracts Plan agent type', () => {
        const md = `### Phase 1: Planning

Use Agent tool with \`subagent_type: "Plan"\` and \`model: "sonnet"\`:`;
        const phase = getFirstPhase(md);
        expect(phase?.data.agent.type).toBe('Plan');
      });

      it('extracts general-purpose agent type', () => {
        const md = `### Phase 1: Execution

Use Agent tool with \`subagent_type: "general-purpose"\` and \`model: "sonnet"\`:`;
        const phase = getFirstPhase(md);
        expect(phase?.data.agent.type).toBe('general-purpose');
      });

      // NOTE: Parser regex requires quotes around the value or specific delimiters.
      // Without quotes, the backtick-colon pattern doesn't match correctly.
      it('requires quotes for agent type extraction (parser limitation)', () => {
        const md = `### Phase 1: Research

Use Agent tool with \`subagent_type: Explore\` and \`model: sonnet\`:`;
        const phase = getFirstPhase(md);
        // Without quotes, falls back to default
        expect(phase?.data.agent.type).toBe('general-purpose');
      });

      it('extracts agent type with JSON-like format', () => {
        const md = `### Phase 1: Research

Use Agent tool with {subagent_type: "Explore", model: "sonnet"}:`;
        const phase = getFirstPhase(md);
        expect(phase?.data.agent.type).toBe('Explore');
      });
    });

    describe('agent model extraction', () => {
      it('extracts opus model', () => {
        const md = `### Phase 1: Analysis

Use Agent tool with \`subagent_type: "Explore"\` and \`model: "opus"\`:`;
        const phase = getFirstPhase(md);
        expect(phase?.data.agent.model).toBe('opus');
      });

      it('extracts sonnet model', () => {
        const md = `### Phase 1: Analysis

Use Agent tool with \`subagent_type: "Explore"\` and \`model: "sonnet"\`:`;
        const phase = getFirstPhase(md);
        expect(phase?.data.agent.model).toBe('sonnet');
      });

      it('extracts haiku model', () => {
        const md = `### Phase 1: Quick Check

Use Agent tool with \`subagent_type: "Explore"\` and \`model: "haiku"\`:`;
        const phase = getFirstPhase(md);
        expect(phase?.data.agent.model).toBe('haiku');
      });

      // NOTE: Parser regex requires quotes around the model value.
      it('requires quotes for model extraction (parser limitation)', () => {
        const md = `### Phase 1: Analysis

Use Agent tool with \`subagent_type: Explore\` and \`model: opus\`:`;
        const phase = getFirstPhase(md);
        // Without quotes, falls back to default
        expect(phase?.data.agent.model).toBe('sonnet');
      });
    });

    describe('prompt extraction', () => {
      it('extracts prompt from fenced code block', () => {
        const md = `### Phase 1: Research

Use Agent tool:

\`\`\`
Find relevant files and analyze them.
\`\`\``;
        const phase = getFirstPhase(md);
        expect(phase?.data.agent.prompt).toBe('Find relevant files and analyze them.');
      });

      it('extracts multi-line prompt', () => {
        const md = `### Phase 1: Research

Use Agent tool:

\`\`\`
First, search for all relevant files.
Then, analyze each file for patterns.
Finally, summarize your findings.
\`\`\``;
        const phase = getFirstPhase(md);
        expect(phase?.data.agent.prompt).toContain('First, search for all relevant files.');
        expect(phase?.data.agent.prompt).toContain('Finally, summarize your findings.');
      });

      it('extracts prompt with special characters', () => {
        const md = `### Phase 1: Analysis

\`\`\`
Look for files matching *.ts and *.tsx patterns.
Check if config["key"] === true.
\`\`\``;
        const phase = getFirstPhase(md);
        expect(phase?.data.agent.prompt).toContain('*.ts');
        expect(phase?.data.agent.prompt).toContain('config["key"]');
      });

      it('trims whitespace from prompt', () => {
        const md = `### Phase 1: Research

\`\`\`

  Trimmed content

\`\`\``;
        const phase = getFirstPhase(md);
        expect(phase?.data.agent.prompt).toBe('Trimmed content');
      });
    });
  });

  describe('description extraction', () => {
    it('extracts description before Use Agent line', () => {
      const md = `### Phase 1: Research

This phase explores the codebase.

Use Agent tool with \`subagent_type: "Explore"\`:`;
      const phase = getFirstPhase(md);
      expect(phase?.data.description).toBe('This phase explores the codebase.');
    });

    it('extracts multi-line description', () => {
      const md = `### Phase 1: Research

This phase has multiple lines.
Each line provides more context.

Use Agent tool:`;
      const phase = getFirstPhase(md);
      expect(phase?.data.description).toContain('multiple lines');
      expect(phase?.data.description).toContain('more context');
    });

    it('extracts description before code block', () => {
      const md = `### Phase 1: Research

Analyze the system architecture.

\`\`\`
Find all config files.
\`\`\``;
      const phase = getFirstPhase(md);
      expect(phase?.data.description).toBe('Analyze the system architecture.');
    });

    it('does not include header in description', () => {
      const md = `### Phase 1: Research

This is the description.

Use Agent tool:`;
      const phase = getFirstPhase(md);
      expect(phase?.data.description).not.toContain('Phase 1');
      expect(phase?.data.description).not.toContain('Research');
    });
  });

  describe('subagent configuration', () => {
    describe('subagent detection', () => {
      it('detects subagent enabled when Subagent Control section present', () => {
        const md = `### Phase 1: Parallel Work

Do multiple tasks.

**Subagent Control:**
- Execution: parallel
- Maximum iterations: 5`;
        const phase = getFirstPhase(md);
        expect(phase?.data.subagent.enabled).toBe(true);
      });

      it('subagent disabled when no Subagent Control section', () => {
        const md = `### Phase 1: Simple Phase

Just do one thing.`;
        const phase = getFirstPhase(md);
        expect(phase?.data.subagent.enabled).toBe(false);
      });
    });

    describe('execution mode', () => {
      it('extracts parallel execution mode', () => {
        const md = `### Phase 1: Parallel Work

**Subagent Control:**
- Execution: parallel`;
        const phase = getFirstPhase(md);
        expect(phase?.data.subagent.execution).toBe('parallel');
      });

      it('extracts sequential execution mode', () => {
        const md = `### Phase 1: Sequential Work

**Subagent Control:**
- Execution: sequential`;
        const phase = getFirstPhase(md);
        expect(phase?.data.subagent.execution).toBe('sequential');
      });

      it('handles case-insensitive execution mode', () => {
        const md = `### Phase 1: Work

**Subagent Control:**
- Execution: PARALLEL`;
        const phase = getFirstPhase(md);
        expect(phase?.data.subagent.execution).toBe('parallel');
      });
    });

    describe('max iterations', () => {
      it('extracts maxIterations from "Maximum iterations: N"', () => {
        const md = `### Phase 1: Retry Work

**Subagent Control:**
- Maximum iterations: 5`;
        const phase = getFirstPhase(md);
        expect(phase?.data.subagent.maxIterations).toBe(5);
      });

      it('extracts large maxIterations value', () => {
        const md = `### Phase 1: Many Retries

**Subagent Control:**
- Maximum iterations: 100`;
        const phase = getFirstPhase(md);
        expect(phase?.data.subagent.maxIterations).toBe(100);
      });

      it('extracts maxIterations of 1', () => {
        const md = `### Phase 1: Single Try

**Subagent Control:**
- Maximum iterations: 1`;
        const phase = getFirstPhase(md);
        expect(phase?.data.subagent.maxIterations).toBe(1);
      });
    });

    describe('timeout', () => {
      it('extracts timeout from "Timeout: N"', () => {
        const md = `### Phase 1: Timed Work

**Subagent Control:**
- Timeout: 120`;
        const phase = getFirstPhase(md);
        expect(phase?.data.subagent.timeout).toBe(120);
      });

      it('extracts timeout with "seconds" suffix', () => {
        const md = `### Phase 1: Timed Work

**Subagent Control:**
- Timeout: 60 seconds`;
        const phase = getFirstPhase(md);
        expect(phase?.data.subagent.timeout).toBe(60);
      });

      it('extracts large timeout value', () => {
        const md = `### Phase 1: Long Running

**Subagent Control:**
- Timeout: 3600`;
        const phase = getFirstPhase(md);
        expect(phase?.data.subagent.timeout).toBe(3600);
      });
    });

    describe('combined subagent config', () => {
      it('extracts all subagent fields together', () => {
        const md = `### Phase 1: Full Config

**Subagent Control:**
- Spawn when: results incomplete
- Execution: parallel
- Maximum iterations: 10
- Timeout: 300 seconds`;
        const phase = getFirstPhase(md);
        expect(phase?.data.subagent.enabled).toBe(true);
        expect(phase?.data.subagent.execution).toBe('parallel');
        expect(phase?.data.subagent.maxIterations).toBe(10);
        expect(phase?.data.subagent.timeout).toBe(300);
      });
    });
  });

  describe('context configuration', () => {
    describe('inputs extraction', () => {
      it('extracts single input', () => {
        const md = `### Phase 1: Process Data

**Input:** user_data`;
        const phase = getFirstPhase(md);
        expect(phase?.data.context.inputs).toEqual(['user_data']);
      });

      it('extracts multiple comma-separated inputs', () => {
        const md = `### Phase 1: Process Data

**Inputs:** user_data, config, settings`;
        const phase = getFirstPhase(md);
        expect(phase?.data.context.inputs).toEqual(['user_data', 'config', 'settings']);
      });

      it('trims whitespace from inputs', () => {
        const md = `### Phase 1: Process Data

**Inputs:**   a ,  b  ,   c   `;
        const phase = getFirstPhase(md);
        expect(phase?.data.context.inputs).toEqual(['a', 'b', 'c']);
      });

      it('handles "Inputs" plural format', () => {
        const md = `### Phase 1: Process Data

**Inputs:** x, y`;
        const phase = getFirstPhase(md);
        expect(phase?.data.context.inputs).toEqual(['x', 'y']);
      });

      it('handles "Input" singular format', () => {
        const md = `### Phase 1: Process Data

**Input:** single_value`;
        const phase = getFirstPhase(md);
        expect(phase?.data.context.inputs).toEqual(['single_value']);
      });
    });

    describe('outputs extraction', () => {
      it('extracts single output', () => {
        const md = `### Phase 1: Generate Report

**Output:** report`;
        const phase = getFirstPhase(md);
        expect(phase?.data.context.outputs).toEqual(['report']);
      });

      it('extracts multiple comma-separated outputs', () => {
        const md = `### Phase 1: Generate Report

**Output:** analysis, summary, recommendations`;
        const phase = getFirstPhase(md);
        expect(phase?.data.context.outputs).toEqual(['analysis', 'summary', 'recommendations']);
      });

      it('trims whitespace from outputs', () => {
        const md = `### Phase 1: Generate

**Output:**   x ,  y  `;
        const phase = getFirstPhase(md);
        expect(phase?.data.context.outputs).toEqual(['x', 'y']);
      });
    });

    describe('combined context', () => {
      it('extracts both inputs and outputs', () => {
        const md = `### Phase 1: Transform

**Inputs:** raw_data, schema
**Output:** transformed_data`;
        const phase = getFirstPhase(md);
        expect(phase?.data.context.inputs).toEqual(['raw_data', 'schema']);
        expect(phase?.data.context.outputs).toEqual(['transformed_data']);
      });
    });
  });

  describe('multiple phases', () => {
    it('parses two phases in order', () => {
      const md = `### Phase 1: Research

Find information.

### Phase 2: Analyze

Process the findings.`;
      const phases = getPhaseNodes(md);
      expect(phases.length).toBe(2);
      expect(phases[0]?.data.label).toBe('Research');
      expect(phases[1]?.data.label).toBe('Analyze');
    });

    it('parses three phases with full content', () => {
      const md = `### Phase 1: Explore

Discover the codebase.

Use Agent tool with \`subagent_type: "Explore"\`:

\`\`\`
Find all relevant files.
\`\`\`

**Output:** file_list

### Phase 2: Plan

Create a plan.

Use Agent tool with \`subagent_type: "Plan"\`:

\`\`\`
Create implementation plan.
\`\`\`

**Inputs:** file_list
**Output:** plan

### Phase 3: Execute

Implement the plan.

\`\`\`
Follow the plan and implement.
\`\`\`

**Inputs:** plan`;
      const phases = getPhaseNodes(md);
      expect(phases.length).toBe(3);
      expect(phases[0]?.data.label).toBe('Explore');
      expect(phases[0]?.data.agent.type).toBe('Explore');
      expect(phases[1]?.data.label).toBe('Plan');
      expect(phases[1]?.data.agent.type).toBe('Plan');
      expect(phases[2]?.data.label).toBe('Execute');
    });

    it('maintains correct order with mixed numbering', () => {
      const md = `### Phase 1: First

### Phase 3: Third

### Phase 2: Second`;
      const phases = getPhaseNodes(md);
      expect(phases.length).toBe(3);
      // Order should be document order, not numerical order
      expect(phases[0]?.data.label).toBe('First');
      expect(phases[1]?.data.label).toBe('Third');
      expect(phases[2]?.data.label).toBe('Second');
    });
  });

  describe('phase with no agent', () => {
    it('parses phase with just description', () => {
      const md = `### Phase 1: Manual Review

This phase requires manual human review.
No automated agent is needed.`;
      const phase = getFirstPhase(md);
      expect(phase).toBeDefined();
      expect(phase?.data.label).toBe('Manual Review');
      expect(phase?.data.description).toContain('manual human review');
    });

    it('uses default agent config when not specified', () => {
      const md = `### Phase 1: Simple Step

Just a description.`;
      const phase = getFirstPhase(md);
      // Should use defaults from defaultPhaseNodeData
      expect(phase?.data.agent.type).toBe('general-purpose');
      expect(phase?.data.agent.model).toBe('sonnet');
      expect(phase?.data.agent.prompt).toBe('');
    });
  });

  describe('phase with minimal content', () => {
    it('parses phase with only header', () => {
      const md = `### Phase 1: Minimal`;
      const phases = getPhaseNodes(md);
      expect(phases.length).toBe(1);
      expect(phases[0]?.data.label).toBe('Minimal');
    });

    it('parses phase with header and single line', () => {
      const md = `### Phase 1: Brief

One line description.`;
      const phase = getFirstPhase(md);
      expect(phase?.data.label).toBe('Brief');
      expect(phase?.data.description).toBe('One line description.');
    });

    it('parses phase with only code block', () => {
      const md = `### Phase 1: Code Only

\`\`\`
Execute this task.
\`\`\``;
      const phase = getFirstPhase(md);
      expect(phase?.data.label).toBe('Code Only');
      expect(phase?.data.agent.prompt).toBe('Execute this task.');
    });
  });

  describe('edge cases', () => {
    it('handles empty phase label gracefully', () => {
      const md = `### Phase 1:

Some content.`;
      const phases = getPhaseNodes(md);
      // Should still create a phase, label may be empty or whitespace
      expect(phases.length).toBe(1);
    });

    it('handles phase with markdown formatting in description', () => {
      const md = `### Phase 1: Rich Text

This has **bold** and *italic* text.
It also has \`inline code\`.`;
      const phase = getFirstPhase(md);
      expect(phase?.data.description).toContain('**bold**');
      expect(phase?.data.description).toContain('*italic*');
    });

    it('handles phase with numbered list in description', () => {
      const md = `### Phase 1: Steps

1. First step
2. Second step
3. Third step

Use Agent tool:`;
      const phase = getFirstPhase(md);
      expect(phase?.data.description).toContain('1. First step');
      expect(phase?.data.description).toContain('3. Third step');
    });

    it('handles code block with language specifier', () => {
      const md = `### Phase 1: Typed Code

\`\`\`typescript
const x = 1;
\`\`\``;
      const phase = getFirstPhase(md);
      // The parser captures content between ``` markers
      // It may or may not strip the language specifier
      expect(phase?.data.agent.prompt).toBeDefined();
    });

    it('handles consecutive phases without blank lines', () => {
      const md = `### Phase 1: First
Content
### Phase 2: Second
More content`;
      const phases = getPhaseNodes(md);
      expect(phases.length).toBe(2);
    });
  });

  describe('full workflow parsing', () => {
    it('creates correct node structure with edges', () => {
      const md = `### Phase 1: Research

Find relevant information.

### Phase 2: Implement

Apply the findings.`;
      const result = parseSkillMd(wrapWithFrontmatter(md));

      // Should have: start, phase1, phase2, end
      expect(result.nodes.length).toBe(4);
      expect(result.nodes[0].type).toBe('start');
      expect(result.nodes[1].type).toBe('phase');
      expect(result.nodes[2].type).toBe('phase');
      expect(result.nodes[3].type).toBe('end');

      // Should have edges connecting them
      expect(result.edges.length).toBe(3);
    });

    it('positions nodes correctly', () => {
      const md = `### Phase 1: One

### Phase 2: Two`;
      const result = parseSkillMd(wrapWithFrontmatter(md));

      const phases = result.nodes.filter((n) => n.type === 'phase');
      // Y positions should increase for each phase
      expect(phases[0].position.y).toBeLessThan(phases[1].position.y);
    });
  });
});
