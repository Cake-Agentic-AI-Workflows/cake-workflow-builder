// src/test/generator/loop-output.test.ts
import { describe, it, expect } from 'vitest';
import { generateSkillMd } from '@/lib/skillGenerator';
import { buildWorkflow, withLoop, assertContainsLoopControl } from '../fixtures/workflowBuilder';

describe('Generator: Loop Control Output', () => {
  describe('Loop control section', () => {
    it('generates Loop Control section for loop-back edge', () => {
      let workflow = buildWorkflow({
        nodes: [
          { type: 'phase', label: 'Analyze' },
          { type: 'phase', label: 'Implement' },
        ],
      });
      workflow = withLoop(workflow, 'Implement', 'Analyze', 3);
      const output = generateSkillMd(workflow);
      expect(output).toContain('**Loop Control:**');
    });

    it('includes target label in loop control', () => {
      let workflow = buildWorkflow({
        nodes: [
          { type: 'phase', label: 'Research' },
          { type: 'phase', label: 'Validate' },
        ],
      });
      workflow = withLoop(workflow, 'Validate', 'Research', 5);
      const output = generateSkillMd(workflow);
      expect(output).toContain('"Research"');
    });

    it('includes max iterations', () => {
      let workflow = buildWorkflow({
        nodes: [
          { type: 'phase', label: 'Try' },
          { type: 'phase', label: 'Check' },
        ],
      });
      workflow = withLoop(workflow, 'Check', 'Try', 7);
      const output = generateSkillMd(workflow);
      expect(output).toContain('7 times');
    });

    it('includes condition when specified', () => {
      let workflow = buildWorkflow({
        nodes: [
          { type: 'phase', label: 'Build' },
          { type: 'phase', label: 'Test' },
        ],
      });
      workflow = withLoop(workflow, 'Test', 'Build', 3, 'if tests fail');
      const output = generateSkillMd(workflow);
      expect(output).toContain('if tests fail');
    });

    it('uses "May repeat" format when no condition', () => {
      let workflow = buildWorkflow({
        nodes: [
          { type: 'phase', label: 'Step1' },
          { type: 'phase', label: 'Step2' },
        ],
      });
      workflow = withLoop(workflow, 'Step2', 'Step1', 3);
      const output = generateSkillMd(workflow);
      expect(output).toMatch(/May repeat back to/);
    });

    it('uses "Repeat back to" format with condition', () => {
      let workflow = buildWorkflow({
        nodes: [
          { type: 'phase', label: 'Step1' },
          { type: 'phase', label: 'Step2' },
        ],
      });
      workflow = withLoop(workflow, 'Step2', 'Step1', 3, 'when needed');
      const output = generateSkillMd(workflow);
      expect(output).toMatch(/Repeat back to/);
    });
  });

  describe('Loop placement', () => {
    it('places loop control on source phase', () => {
      let workflow = buildWorkflow({
        nodes: [
          { type: 'phase', label: 'First' },
          { type: 'phase', label: 'Second' },
          { type: 'phase', label: 'Third' },
        ],
      });
      workflow = withLoop(workflow, 'Third', 'First', 5);
      const output = generateSkillMd(workflow);
      // Loop control should appear after Phase 3: Third
      const phase3Index = output.indexOf('### Phase 3: Third');
      const loopControlIndex = output.indexOf('**Loop Control:**');
      expect(phase3Index).toBeGreaterThan(-1);
      expect(loopControlIndex).toBeGreaterThan(phase3Index);
    });
  });

  describe('Default iterations', () => {
    it('defaults to 3 iterations when maxIterations is undefined', () => {
      const workflow = buildWorkflow({
        nodes: [
          { type: 'phase', label: 'A' },
          { type: 'phase', label: 'B' },
        ],
        edges: [
          { from: 'start', to: 'A' },
          { from: 'A', to: 'B' },
          { from: 'B', to: 'end' },
          { from: 'B', to: 'A', loop: { maxIterations: 0 } }, // 0 should default to 3
        ],
      });
      const output = generateSkillMd(workflow);
      expect(output).toContain('3 times');
    });
  });

  describe('Assertion helper', () => {
    it('assertContainsLoopControl validates output', () => {
      let workflow = buildWorkflow({
        nodes: [
          { type: 'phase', label: 'Alpha' },
          { type: 'phase', label: 'Beta' },
        ],
      });
      workflow = withLoop(workflow, 'Beta', 'Alpha', 4);
      const output = generateSkillMd(workflow);
      // Should not throw
      assertContainsLoopControl(output, 'Alpha', 4);
    });
  });
});
