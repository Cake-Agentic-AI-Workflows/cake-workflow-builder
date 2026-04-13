// src/test/generator/phase-output.test.ts
import { describe, it, expect } from 'vitest';
import { generateSkillMd } from '@/lib/skillGenerator';
import { buildWorkflow, assertContainsPhase } from '../fixtures/workflowBuilder';

describe('Generator: Phase Node Output', () => {
  describe('Phase numbering', () => {
    it('numbers single phase as Phase 1', () => {
      const workflow = buildWorkflow({
        nodes: [{ type: 'phase', label: 'Analyze' }],
      });
      const output = generateSkillMd(workflow);
      assertContainsPhase(output, 1, 'Analyze');
    });

    it('numbers multiple phases sequentially', () => {
      const workflow = buildWorkflow({
        nodes: [
          { type: 'phase', label: 'Analyze' },
          { type: 'phase', label: 'Implement' },
          { type: 'phase', label: 'Review' },
        ],
      });
      const output = generateSkillMd(workflow);
      assertContainsPhase(output, 1, 'Analyze');
      assertContainsPhase(output, 2, 'Implement');
      assertContainsPhase(output, 3, 'Review');
    });

    it('skips approval nodes in phase numbering', () => {
      const workflow = buildWorkflow({
        nodes: [
          { type: 'phase', label: 'First' },
          { type: 'approval', label: 'Approval Gate' },
          { type: 'phase', label: 'Second' },
        ],
      });
      const output = generateSkillMd(workflow);
      assertContainsPhase(output, 1, 'First');
      assertContainsPhase(output, 2, 'Second');
      expect(output).not.toMatch(/Phase 3/);
    });
  });

  describe('Agent configuration output', () => {
    it('includes agent type and model', () => {
      const workflow = buildWorkflow({
        nodes: [
          {
            type: 'phase',
            label: 'Research',
            data: {
              agent: { type: 'Explore', model: 'opus', prompt: 'Find relevant code' },
            },
          },
        ],
      });
      const output = generateSkillMd(workflow);
      expect(output).toContain('subagent_type: "Explore"');
      expect(output).toContain('model: "opus"');
    });

    it('includes prompt in code block', () => {
      const workflow = buildWorkflow({
        nodes: [
          {
            type: 'phase',
            label: 'Research',
            data: {
              agent: { type: 'Explore', model: 'sonnet', prompt: 'Search the codebase for patterns' },
            },
          },
        ],
      });
      const output = generateSkillMd(workflow);
      expect(output).toContain('```');
      expect(output).toContain('Search the codebase for patterns');
    });

    it('omits agent section when type is none and no prompt', () => {
      const workflow = buildWorkflow({
        nodes: [
          {
            type: 'phase',
            label: 'Manual Step',
            data: {
              description: 'Do something manually',
              agent: { type: 'none', model: 'sonnet', prompt: '' },
            },
          },
        ],
      });
      const output = generateSkillMd(workflow);
      expect(output).not.toContain('Use Agent tool');
      expect(output).toContain('Do something manually');
    });
  });

  describe('Description output', () => {
    it('includes description text', () => {
      const workflow = buildWorkflow({
        nodes: [
          {
            type: 'phase',
            label: 'Analyze',
            data: { description: 'Analyze the problem thoroughly' },
          },
        ],
      });
      const output = generateSkillMd(workflow);
      expect(output).toContain('Analyze the problem thoroughly');
    });
  });

  describe('Subagent control output', () => {
    it('includes subagent section when enabled', () => {
      const workflow = buildWorkflow({
        nodes: [
          {
            type: 'phase',
            label: 'Parallel Work',
            data: {
              subagent: {
                enabled: true,
                condition: 'when multiple files need changes',
                execution: 'parallel',
                maxIterations: 5,
                timeout: 300,
              },
            },
          },
        ],
      });
      const output = generateSkillMd(workflow);
      expect(output).toContain('**Subagent Control:**');
      expect(output).toContain('Spawn when: when multiple files need changes');
      expect(output).toContain('Execution: parallel');
      expect(output).toContain('Maximum iterations: 5');
      expect(output).toContain('Timeout: 300 seconds');
    });

    it('omits subagent section when disabled', () => {
      const workflow = buildWorkflow({
        nodes: [
          {
            type: 'phase',
            label: 'Simple Phase',
            data: {
              subagent: { enabled: false, condition: '', execution: 'sequential', maxIterations: 3, timeout: 120 },
            },
          },
        ],
      });
      const output = generateSkillMd(workflow);
      expect(output).not.toContain('**Subagent Control:**');
    });
  });

  describe('Context output', () => {
    it('includes inputs when specified', () => {
      const workflow = buildWorkflow({
        nodes: [
          {
            type: 'phase',
            label: 'Process',
            data: {
              context: { inputs: ['file_path', 'config'], outputs: [], sizeLimit: undefined },
            },
          },
        ],
      });
      const output = generateSkillMd(workflow);
      expect(output).toContain('**Inputs:** file_path, config');
    });

    it('includes outputs when specified', () => {
      const workflow = buildWorkflow({
        nodes: [
          {
            type: 'phase',
            label: 'Generate',
            data: {
              context: { inputs: [], outputs: ['result', 'report'], sizeLimit: undefined },
            },
          },
        ],
      });
      const output = generateSkillMd(workflow);
      expect(output).toContain('**Output:** result, report');
    });

    it('includes context limit when specified', () => {
      const workflow = buildWorkflow({
        nodes: [
          {
            type: 'phase',
            label: 'Limited',
            data: {
              context: { inputs: [], outputs: [], sizeLimit: 5000 },
            },
          },
        ],
      });
      const output = generateSkillMd(workflow);
      expect(output).toContain('**Context limit:** 5000 tokens');
    });

    it('omits empty context fields', () => {
      const workflow = buildWorkflow({
        nodes: [{ type: 'phase', label: 'Basic' }],
      });
      const output = generateSkillMd(workflow);
      expect(output).not.toContain('**Inputs:**');
      expect(output).not.toContain('**Output:**');
      expect(output).not.toContain('**Context limit:**');
    });
  });
});
