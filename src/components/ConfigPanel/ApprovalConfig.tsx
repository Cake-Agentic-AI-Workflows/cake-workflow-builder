'use client';

import { useWorkflowStore } from '@/store/workflowStore';
import { ApprovalNodeData, ApprovalOption } from '@/types/workflow';
import { Trash2, Plus, X } from 'lucide-react';

interface ApprovalConfigProps {
  nodeId: string;
  data: ApprovalNodeData;
}

export function ApprovalConfig({ nodeId, data }: ApprovalConfigProps) {
  const { updateNodeData, deleteNode } = useWorkflowStore();

  const updateData = (updates: Partial<ApprovalNodeData>) => {
    updateNodeData<ApprovalNodeData>(nodeId, updates);
  };

  const addOption = () => {
    updateData({
      options: [...data.options, { label: 'New Option', description: '' }],
    });
  };

  const updateOption = (index: number, updates: Partial<ApprovalOption>) => {
    const newOptions = [...data.options];
    newOptions[index] = { ...newOptions[index], ...updates };
    updateData({ options: newOptions });
  };

  const removeOption = (index: number) => {
    if (data.options.length <= 2) return; // Keep at least 2 options
    updateData({ options: data.options.filter((_, i) => i !== index) });
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Approval Gate Configuration</h3>
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
          <label className="text-sm">Question</label>
          <textarea
            value={data.question}
            onChange={(e) => updateData({ question: e.target.value })}
            rows={3}
            className="w-full mt-1 px-3 py-2 border rounded-md text-sm resize-none"
            placeholder="What question should be asked to the user?"
          />
        </div>
      </section>

      {/* Options */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-muted-foreground">Options</h4>
          <button
            onClick={addOption}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Plus className="w-3 h-3" />
            Add Option
          </button>
        </div>

        <div className="space-y-3">
          {data.options.map((option, index) => (
            <div
              key={index}
              className="p-3 border rounded-md bg-muted/30 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Option {index + 1}
                </span>
                {data.options.length > 2 && (
                  <button
                    onClick={() => removeOption(index)}
                    className="p-1 text-muted-foreground hover:text-destructive"
                    title="Remove option"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div>
                <label className="text-xs">Label</label>
                <input
                  type="text"
                  value={option.label}
                  onChange={(e) => updateOption(index, { label: e.target.value })}
                  className="w-full mt-1 px-2 py-1.5 border rounded text-sm"
                  placeholder="e.g., Yes"
                />
              </div>
              <div>
                <label className="text-xs">Description</label>
                <input
                  type="text"
                  value={option.description}
                  onChange={(e) =>
                    updateOption(index, { description: e.target.value })
                  }
                  className="w-full mt-1 px-2 py-1.5 border rounded text-sm"
                  placeholder="What happens if selected?"
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Help text */}
      <div className="text-xs text-muted-foreground p-3 bg-muted/30 rounded-md">
        <p>
          Approval gates pause the workflow and ask the user a question. The
          workflow continues after the user makes a selection.
        </p>
      </div>
    </div>
  );
}
