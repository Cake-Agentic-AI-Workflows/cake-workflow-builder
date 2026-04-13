// src/test/generator/decision-output.test.ts
import { describe, it, expect } from 'vitest';
import { generateSkillMd } from '@/lib/skillGenerator';
import { buildWorkflow, assertContainsDecision } from '../fixtures/workflowBuilder';

describe('Generator: Decision Node Output', () => {
  describe('Basic structure', () => {
    it('generates decision header with label', () => {
      const workflow = buildWorkflow({
        nodes: [{ type: 'decision', label: 'Choose Path' }],
      });
      const output = generateSkillMd(workflow);
      expect(output).toContain('### Decision: Choose Path');
    });

    it('includes question in bold', () => {
      const workflow = buildWorkflow({
        nodes: [
          {
            type: 'decision',
            label: 'Branch',
            data: {
              question: 'What should happen next?',
              branches: [
                { id: 'branch-1', label: 'Option A', condition: 'when A' },
                { id: 'branch-2', label: 'Option B', condition: 'when B' },
              ],
            },
          },
        ],
      });
      const output = generateSkillMd(workflow);
      expect(output).toContain('**What should happen next?**');
    });
  });

  describe('Branch output', () => {
    it('lists all branches with conditions', () => {
      const workflow = buildWorkflow({
        nodes: [
          {
            type: 'decision',
            label: 'Review Outcome',
            data: {
              question: 'What was the result?',
              branches: [
                { id: 'branch-1', label: 'Tests Pass', condition: 'all tests green' },
                { id: 'branch-2', label: 'Tests Fail', condition: 'any test red' },
              ],
            },
          },
        ],
        edges: [
          { from: 'start', to: 'Review Outcome' },
          { from: 'Review Outcome', to: 'end', branch: 'branch-1' },
          { from: 'Review Outcome', to: 'end', branch: 'branch-2' },
        ],
      });
      const output = generateSkillMd(workflow);
      expect(output).toContain('**Tests Pass**');
      expect(output).toContain('all tests green');
      expect(output).toContain('**Tests Fail**');
      expect(output).toContain('any test red');
    });

    it('includes Go to target for each branch', () => {
      const workflow = buildWorkflow({
        nodes: [
          {
            type: 'decision',
            label: 'Route',
            data: {
              question: 'Which way?',
              branches: [
                { id: 'branch-1', label: 'Left', condition: 'go left' },
                { id: 'branch-2', label: 'Right', condition: 'go right' },
              ],
            },
          },
          { type: 'phase', label: 'Left Path' },
          { type: 'phase', label: 'Right Path' },
        ],
        edges: [
          { from: 'start', to: 'Route' },
          { from: 'Route', to: 'Left Path', branch: 'branch-1' },
          { from: 'Route', to: 'Right Path', branch: 'branch-2' },
          { from: 'Left Path', to: 'end' },
          { from: 'Right Path', to: 'end' },
        ],
      });
      const output = generateSkillMd(workflow);
      expect(output).toContain('Go to: Left Path');
      expect(output).toContain('Go to: Right Path');
    });
  });

  describe('Assertion helper', () => {
    it('assertContainsDecision validates branches', () => {
      const workflow = buildWorkflow({
        nodes: [
          {
            type: 'decision',
            label: 'Fork',
            data: {
              question: 'Choose',
              branches: [
                { id: 'branch-1', label: 'A', condition: 'pick A' },
                { id: 'branch-2', label: 'B', condition: 'pick B' },
              ],
            },
          },
        ],
      });
      const output = generateSkillMd(workflow);
      // Should not throw
      assertContainsDecision(output, 'Fork', ['A', 'B']);
    });
  });
});
