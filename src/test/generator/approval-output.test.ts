// src/test/generator/approval-output.test.ts
import { describe, it, expect } from 'vitest';
import { generateSkillMd } from '@/lib/skillGenerator';
import { buildWorkflow, assertContainsApproval } from '../fixtures/workflowBuilder';

describe('Generator: Approval Node Output', () => {
  describe('Basic structure', () => {
    it('generates approval header with label', () => {
      const workflow = buildWorkflow({
        nodes: [{ type: 'approval', label: 'Confirm Changes' }],
      });
      const output = generateSkillMd(workflow);
      expect(output).toContain('### Confirm Changes');
    });

    it('includes AskUserQuestion instruction', () => {
      const workflow = buildWorkflow({
        nodes: [{ type: 'approval', label: 'Approval Gate' }],
      });
      const output = generateSkillMd(workflow);
      expect(output).toContain('Use `AskUserQuestion` to confirm:');
    });

    it('includes do not proceed warning', () => {
      const workflow = buildWorkflow({
        nodes: [{ type: 'approval', label: 'Approval Gate' }],
      });
      const output = generateSkillMd(workflow);
      expect(output).toContain('**Do NOT proceed without user confirmation.**');
    });
  });

  describe('Question and options', () => {
    it('includes question in code block', () => {
      const workflow = buildWorkflow({
        nodes: [
          {
            type: 'approval',
            label: 'Confirm',
            data: {
              question: 'Are you ready to deploy?',
              options: [
                { label: 'Yes', description: 'Deploy now' },
                { label: 'No', description: 'Cancel deployment' },
              ],
            },
          },
        ],
      });
      const output = generateSkillMd(workflow);
      expect(output).toContain('Question: "Are you ready to deploy?"');
    });

    it('lists all options with descriptions', () => {
      const workflow = buildWorkflow({
        nodes: [
          {
            type: 'approval',
            label: 'Review',
            data: {
              question: 'How should we proceed?',
              options: [
                { label: 'Approve', description: 'Accept the changes' },
                { label: 'Reject', description: 'Discard the changes' },
                { label: 'Revise', description: 'Request modifications' },
              ],
            },
          },
        ],
      });
      const output = generateSkillMd(workflow);
      expect(output).toContain('- Approve: Accept the changes');
      expect(output).toContain('- Reject: Discard the changes');
      expect(output).toContain('- Revise: Request modifications');
    });
  });

  describe('Assertion helper', () => {
    it('assertContainsApproval validates output', () => {
      const workflow = buildWorkflow({
        nodes: [
          {
            type: 'approval',
            label: 'Gate',
            data: {
              question: 'Continue?',
              options: [
                { label: 'Yes', description: 'Go ahead' },
                { label: 'No', description: 'Stop' },
              ],
            },
          },
        ],
      });
      const output = generateSkillMd(workflow);
      // Should not throw
      assertContainsApproval(output, 'Gate', 'Continue?');
    });
  });
});
