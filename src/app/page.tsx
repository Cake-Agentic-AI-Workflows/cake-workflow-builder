'use client';

import { useState } from 'react';
import { Download, Upload, Plus, Cake } from 'lucide-react';
import { WorkflowCanvas } from '@/components/Canvas/WorkflowCanvas';
import { NodePalette } from '@/components/Sidebar/NodePalette';
import { ConfigPanel } from '@/components/ConfigPanel/ConfigPanel';
import { ExportModal } from '@/components/Export/ExportModal';
import { ImportModal } from '@/components/Import/ImportModal';
import { useWorkflowStore } from '@/store/workflowStore';

export default function Home() {
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const { resetWorkflow } = useWorkflowStore();

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b bg-card">
        <div className="flex items-center gap-2">
          <Cake className="w-6 h-6 text-primary" />
          <h1 className="text-lg font-semibold">Cake Workflow Builder</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm border rounded hover:bg-muted"
          >
            <Upload className="w-4 h-4" />
            Import
          </button>
          <button
            onClick={() => setShowExport(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm border rounded hover:bg-muted"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={resetWorkflow}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" />
            New
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        <NodePalette />
        <WorkflowCanvas />
        <ConfigPanel />
      </main>

      {/* Modals */}
      <ExportModal isOpen={showExport} onClose={() => setShowExport(false)} />
      <ImportModal isOpen={showImport} onClose={() => setShowImport(false)} />
    </div>
  );
}
