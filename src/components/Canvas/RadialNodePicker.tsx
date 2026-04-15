'use client';

import { useCallback, useEffect } from 'react';
import { Play, Square, Cog, HelpCircle, GitBranch } from 'lucide-react';
import { useWorkflowStore } from '@/store/workflowStore';
import { NodeType } from '@/types/workflow';
import { getHandlesForDirection, getSpawnPosition } from '@/utils/spatialUtils';
import { cn } from '@/lib/utils';

interface NodeOption {
  type: NodeType;
  label: string;
  icon: React.ReactNode;
  shortcutNumber: string;
  shortcutLetter: string;
  angle: number; // degrees, 0 = top
}

const nodeOptions: NodeOption[] = [
  { type: 'phase', label: 'Phase', icon: <Cog className="w-5 h-5" />, shortcutNumber: '1', shortcutLetter: 'p', angle: 0 },
  { type: 'end', label: 'End', icon: <Square className="w-5 h-5" />, shortcutNumber: '2', shortcutLetter: 'e', angle: 72 },
  { type: 'start', label: 'Start', icon: <Play className="w-5 h-5" />, shortcutNumber: '3', shortcutLetter: 's', angle: 144 },
  { type: 'decision', label: 'Decision', icon: <GitBranch className="w-5 h-5" />, shortcutNumber: '5', shortcutLetter: 'd', angle: 216 },
  { type: 'approval', label: 'Approval', icon: <HelpCircle className="w-5 h-5" />, shortcutNumber: '4', shortcutLetter: 'a', angle: 288 },
];

export function RadialNodePicker() {
  const { radialMenu, closeRadialMenu, nodes, addNodeByType, onConnect } = useWorkflowStore();
  const { isOpen, position, sourceNodeId, direction } = radialMenu;

  const handleSelectNode = useCallback(
    (nodeType: NodeType) => {
      if (!sourceNodeId || !direction) return;

      const sourceNode = nodes.find((n) => n.id === sourceNodeId);
      if (!sourceNode) return;

      // Get spawn position and create node
      const spawnPos = getSpawnPosition(sourceNode, direction);
      const newNodeId = addNodeByType(nodeType, spawnPos);

      // Connect source to new node
      const { sourceHandle, targetHandle } = getHandlesForDirection(direction);
      onConnect({
        source: sourceNodeId,
        target: newNodeId,
        sourceHandle,
        targetHandle,
      });

      closeRadialMenu();
    },
    [sourceNodeId, direction, nodes, addNodeByType, onConnect, closeRadialMenu]
  );

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeRadialMenu();
        return;
      }

      const key = e.key.toLowerCase();
      const option = nodeOptions.find(
        (opt) => opt.shortcutNumber === key || opt.shortcutLetter === key
      );

      if (option) {
        handleSelectNode(option.type);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeRadialMenu, handleSelectNode]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.radial-menu')) {
        closeRadialMenu();
      }
    };

    // Delay to avoid immediate close from the trigger click
    const timeout = setTimeout(() => {
      window.addEventListener('click', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('click', handleClickOutside);
    };
  }, [isOpen, closeRadialMenu]);

  if (!isOpen) return null;

  const radius = 80;

  return (
    <div
      className="radial-menu fixed z-50"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {/* Center indicator */}
      <div className="absolute w-3 h-3 bg-primary rounded-full -translate-x-1/2 -translate-y-1/2" />

      {/* Node options arranged in circle */}
      {nodeOptions.map((option) => {
        const angleRad = (option.angle - 90) * (Math.PI / 180);
        const x = Math.cos(angleRad) * radius;
        const y = Math.sin(angleRad) * radius;

        return (
          <button
            key={option.type}
            className={cn(
              'absolute flex flex-col items-center justify-center',
              'w-14 h-14 rounded-full',
              'bg-white border-2 border-gray-200',
              'hover:border-primary hover:bg-primary/10',
              'transition-all duration-150',
              'shadow-md hover:shadow-lg'
            )}
            style={{
              left: x,
              top: y,
              transform: 'translate(-50%, -50%)',
            }}
            onClick={() => handleSelectNode(option.type)}
            title={`${option.label} [${option.shortcutNumber}/${option.shortcutLetter.toUpperCase()}]`}
          >
            {option.icon}
            <span className="text-[10px] font-medium mt-0.5">{option.shortcutNumber}</span>
          </button>
        );
      })}

      {/* Hint text */}
      <div
        className="absolute text-xs text-muted-foreground bg-white/90 px-2 py-1 rounded whitespace-nowrap"
        style={{ top: radius + 40, left: '50%', transform: 'translateX(-50%)' }}
      >
        Press 1-5 or letter • Esc to cancel
      </div>
    </div>
  );
}
