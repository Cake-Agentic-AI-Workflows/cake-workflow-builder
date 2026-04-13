'use client';

import { useWorkflowStore } from '@/store/workflowStore';
import { DecisionNodeData, DecisionBranch } from '@/types/workflow';
import { Trash2, Plus, X } from 'lucide-react';

interface DecisionConfigProps {
  nodeId: string;
  data: DecisionNodeData;
}

export function DecisionConfig({ nodeId, data }: DecisionConfigProps) {
  const { updateNodeData, deleteNode } = useWorkflowStore();

  const updateData = (updates: Partial<DecisionNodeData>) => {
    updateNodeData<DecisionNodeData>(nodeId, updates);
  };

  const addBranch = () => {
    if (data.branches.length >= 4) return;
    const newBranch: DecisionBranch = {
      id: `branch-${Date.now()}`,
      label: `Option ${String.fromCharCode(65 + data.branches.length)}`,
      condition: '',
    };
    updateData({ branches: [...data.branches, newBranch] });
  };

  const updateBranch = (index: number, updates: Partial<DecisionBranch>) => {
    const newBranches = [...data.branches];
    newBranches[index] = { ...newBranches[index], ...updates };
    updateData({ branches: newBranches });
  };

  const removeBranch = (index: number) => {
    if (data.branches.length <= 2) return;
    const newBranches = data.branches.filter((_, i) => i !== index);
    updateData({ branches: newBranches });
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Decision Configuration</h3>
        <button
          onClick={() => deleteNode(nodeId)}
          className="p-2 text-destructive hover:bg-destructive/10 rounded"
          title="Delete node"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

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
          <label className="text-sm">Decision Question</label>
          <textarea
            value={data.question}
            onChange={(e) => updateData({ question: e.target.value })}
            rows={2}
            className="w-full mt-1 px-3 py-2 border rounded-md text-sm resize-none"
            placeholder="What determines the path?"
          />
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-muted-foreground">
            Branches ({data.branches.length}/4)
          </h4>
          <button
            onClick={addBranch}
            disabled={data.branches.length >= 4}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-3 h-3" />
            Add
          </button>
        </div>

        <div className="space-y-3">
          {data.branches.map((branch, index) => (
            <div
              key={branch.id}
              className="p-3 border rounded-md space-y-2 bg-muted/30"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  Branch {index + 1}
                </span>
                <button
                  onClick={() => removeBranch(index)}
                  disabled={data.branches.length <= 2}
                  className="p-1 text-muted-foreground hover:text-destructive disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Remove branch"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              <div>
                <label className="text-xs">Label</label>
                <input
                  type="text"
                  value={branch.label}
                  onChange={(e) => updateBranch(index, { label: e.target.value })}
                  className="w-full mt-1 px-2 py-1.5 border rounded text-sm"
                  placeholder="Option name"
                />
              </div>
              <div>
                <label className="text-xs">Condition</label>
                <input
                  type="text"
                  value={branch.condition}
                  onChange={(e) => updateBranch(index, { condition: e.target.value })}
                  className="w-full mt-1 px-2 py-1.5 border rounded text-sm"
                  placeholder="When this branch is taken"
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
