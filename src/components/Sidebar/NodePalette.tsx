'use client';

import { Cog, HelpCircle, GitBranch } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SkillTemplates } from './SkillTemplates';

interface DraggableNodeProps {
  type: 'phase' | 'approval' | 'decision';
  label: string;
  icon: React.ReactNode;
  color: string;
}

function DraggableNode({ type, label, icon, color }: DraggableNodeProps) {
  const onDragStart = (event: React.DragEvent) => {
    event.dataTransfer.setData('application/reactflow', type);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className={cn(
        'flex items-center gap-2 p-3 rounded-lg border-2 cursor-grab active:cursor-grabbing transition-all hover:shadow-md',
        color
      )}
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

export function NodePalette() {
  return (
    <div className="w-56 p-4 border-r bg-card flex flex-col">
      <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wider">
        Nodes
      </h3>
      <div className="space-y-3">
        <DraggableNode
          type="phase"
          label="Phase"
          icon={<Cog className="w-4 h-4" />}
          color="border-blue-300 bg-blue-50 hover:border-blue-400"
        />
        <DraggableNode
          type="approval"
          label="Approval Gate"
          icon={<HelpCircle className="w-4 h-4" />}
          color="border-yellow-300 bg-yellow-50 hover:border-yellow-400"
        />
        <DraggableNode
          type="decision"
          label="Decision"
          icon={<GitBranch className="w-4 h-4" />}
          color="border-amber-300 bg-amber-50 hover:border-amber-400"
        />
      </div>
      <div className="mt-6 text-xs text-muted-foreground">
        <p className="mb-2">
          Drag a node onto the canvas to add it to your workflow.
        </p>
        <p>
          Connect nodes by dragging from one handle to another.
        </p>
      </div>

      {/* Skill Templates Section */}
      <div className="mt-6 pt-6 border-t flex-1 overflow-auto">
        <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wider">
          Templates
        </h3>
        <SkillTemplates />
      </div>
    </div>
  );
}
