'use client';

import { useWorkflowStore } from '@/store/workflowStore';
import {
  PhaseNodeData,
  AgentType,
  ModelType,
  ExecutionMode,
} from '@/types/workflow';
import { Trash2 } from 'lucide-react';

interface PhaseConfigProps {
  nodeId: string;
  data: PhaseNodeData;
}

export function PhaseConfig({ nodeId, data }: PhaseConfigProps) {
  const { updateNodeData, deleteNode } = useWorkflowStore();

  const updateData = (updates: Partial<PhaseNodeData>) => {
    updateNodeData<PhaseNodeData>(nodeId, updates);
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Phase Configuration</h3>
        <button
          onClick={() => deleteNode(nodeId)}
          className="p-2 text-destructive hover:bg-destructive/10 rounded"
          title="Delete node"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Basic Info */}
      <section className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground">Basic Info</h4>
        <div>
          <label className="text-sm">Label</label>
          <input
            type="text"
            value={data.label}
            onChange={(e) => updateData({ label: e.target.value })}
            className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
          />
        </div>
        <div>
          <label className="text-sm">Description</label>
          <textarea
            value={data.description}
            onChange={(e) => updateData({ description: e.target.value })}
            rows={2}
            className="w-full mt-1 px-3 py-2 border rounded-md text-sm resize-none"
            placeholder="What does this phase do?"
          />
        </div>
      </section>

      {/* Agent Configuration */}
      <section className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground">Agent</h4>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-sm">Type</label>
            <select
              value={data.agent.type}
              onChange={(e) =>
                updateData({
                  agent: { ...data.agent, type: e.target.value as AgentType },
                })
              }
              className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
            >
              <option value="none">None</option>
              <option value="Explore">Explore</option>
              <option value="Plan">Plan</option>
              <option value="general-purpose">General</option>
            </select>
          </div>
          <div>
            <label className="text-sm">Model</label>
            <select
              value={data.agent.model}
              onChange={(e) =>
                updateData({
                  agent: { ...data.agent, model: e.target.value as ModelType },
                })
              }
              className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
              disabled={data.agent.type === 'none'}
            >
              <option value="sonnet">Sonnet</option>
              <option value="opus">Opus</option>
              <option value="haiku">Haiku</option>
            </select>
          </div>
        </div>
        <div>
          <label className="text-sm">Prompt / Instructions</label>
          <textarea
            value={data.agent.prompt}
            onChange={(e) =>
              updateData({ agent: { ...data.agent, prompt: e.target.value } })
            }
            rows={6}
            className="w-full mt-1 px-3 py-2 border rounded-md text-sm font-mono resize-none"
            placeholder="Enter the prompt or instructions for this phase..."
          />
        </div>
      </section>

      {/* Subagent Configuration */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-muted-foreground">Subagent Control</h4>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={data.subagent.enabled}
              onChange={(e) =>
                updateData({
                  subagent: { ...data.subagent, enabled: e.target.checked },
                })
              }
              className="rounded"
            />
            Enable
          </label>
        </div>
        {data.subagent.enabled && (
          <>
            <div>
              <label className="text-sm">Condition</label>
              <input
                type="text"
                value={data.subagent.condition}
                onChange={(e) =>
                  updateData({
                    subagent: { ...data.subagent, condition: e.target.value },
                  })
                }
                className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                placeholder="When to spawn subagent..."
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-sm">Execution</label>
                <select
                  value={data.subagent.execution}
                  onChange={(e) =>
                    updateData({
                      subagent: {
                        ...data.subagent,
                        execution: e.target.value as ExecutionMode,
                      },
                    })
                  }
                  className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                >
                  <option value="sequential">Sequential</option>
                  <option value="parallel">Parallel</option>
                </select>
              </div>
              <div>
                <label className="text-sm">Max Iterations</label>
                <input
                  type="number"
                  value={data.subagent.maxIterations}
                  onChange={(e) =>
                    updateData({
                      subagent: {
                        ...data.subagent,
                        maxIterations: parseInt(e.target.value) || 0,
                      },
                    })
                  }
                  min={0}
                  className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                />
              </div>
            </div>
            <div>
              <label className="text-sm">Timeout (seconds)</label>
              <input
                type="number"
                value={data.subagent.timeout}
                onChange={(e) =>
                  updateData({
                    subagent: {
                      ...data.subagent,
                      timeout: parseInt(e.target.value) || 0,
                    },
                  })
                }
                min={0}
                className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
              />
            </div>
          </>
        )}
      </section>

      {/* Context Configuration */}
      <section className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground">Context</h4>
        <div>
          <label className="text-sm">Inputs (comma-separated)</label>
          <input
            type="text"
            value={data.context.inputs.join(', ')}
            onChange={(e) =>
              updateData({
                context: {
                  ...data.context,
                  inputs: e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                },
              })
            }
            className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
            placeholder="e.g., ticket_summary, requirements"
          />
        </div>
        <div>
          <label className="text-sm">Outputs (comma-separated)</label>
          <input
            type="text"
            value={data.context.outputs.join(', ')}
            onChange={(e) =>
              updateData({
                context: {
                  ...data.context,
                  outputs: e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                },
              })
            }
            className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
            placeholder="e.g., analysis_result"
          />
        </div>
        <div>
          <label className="text-sm">Size Limit (tokens, optional)</label>
          <input
            type="number"
            value={data.context.sizeLimit || ''}
            onChange={(e) =>
              updateData({
                context: {
                  ...data.context,
                  sizeLimit: e.target.value ? parseInt(e.target.value) : undefined,
                },
              })
            }
            min={0}
            className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
            placeholder="No limit"
          />
        </div>
      </section>
    </div>
  );
}
