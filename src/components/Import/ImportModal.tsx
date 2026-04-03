'use client';

import { useState, useRef } from 'react';
import { X, Upload, AlertCircle } from 'lucide-react';
import { useWorkflowStore } from '@/store/workflowStore';
import { parseSkillMd } from '@/lib/skillParser';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImportModal({ isOpen, onClose }: ImportModalProps) {
  const { loadWorkflow } = useWorkflowStore();
  const [content, setContent] = useState('');
  const [preview, setPreview] = useState<{
    nodeCount: number;
    edgeCount: number;
    warnings: string[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setContent(text);
      analyzeContent(text);
    };
    reader.readAsText(file);
  };

  const analyzeContent = (text: string) => {
    try {
      const result = parseSkillMd(text);
      setPreview({
        nodeCount: result.nodes.length,
        edgeCount: result.edges.length,
        warnings: result.warnings,
      });
    } catch {
      setPreview({
        nodeCount: 0,
        edgeCount: 0,
        warnings: ['Failed to parse SKILL.md - invalid format'],
      });
    }
  };

  const handleImport = () => {
    try {
      const result = parseSkillMd(content);
      loadWorkflow(result.nodes, result.edges, result.metadata);
      onClose();
    } catch (error) {
      console.error('Import failed:', error);
    }
  };

  const handleTextChange = (text: string) => {
    setContent(text);
    if (text.trim()) {
      analyzeContent(text);
    } else {
      setPreview(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card w-full max-w-2xl max-h-[90vh] rounded-lg shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Import SKILL.md</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {/* File upload */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".md"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full p-6 border-2 border-dashed rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Upload className="w-8 h-8" />
                <span className="text-sm">Click to upload SKILL.md</span>
              </div>
            </button>
          </div>

          <div className="text-center text-sm text-muted-foreground">or</div>

          {/* Paste content */}
          <div>
            <label className="text-sm font-medium">Paste SKILL.md content</label>
            <textarea
              value={content}
              onChange={(e) => handleTextChange(e.target.value)}
              rows={10}
              className="w-full mt-2 px-3 py-2 border rounded-md text-sm font-mono resize-none"
              placeholder="Paste your SKILL.md content here..."
            />
          </div>

          {/* Preview */}
          {preview && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <h3 className="text-sm font-medium mb-2">Import Preview</h3>
              <div className="text-sm space-y-1">
                <p>
                  Nodes to create:{' '}
                  <span className="font-medium">{preview.nodeCount}</span>
                </p>
                <p>
                  Connections:{' '}
                  <span className="font-medium">{preview.edgeCount}</span>
                </p>
              </div>
              {preview.warnings.length > 0 && (
                <div className="mt-3">
                  <div className="text-sm text-yellow-600 flex items-center gap-1 mb-1">
                    <AlertCircle className="w-4 h-4" />
                    Warnings
                  </div>
                  <ul className="text-xs text-yellow-600 space-y-1">
                    {preview.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Help text */}
          <div className="text-xs text-muted-foreground p-3 bg-muted/30 rounded-md">
            <p className="font-medium mb-1">Note:</p>
            <p>
              Import works best with SKILL.md files generated by this builder.
              Hand-written skills may import with warnings or require manual
              adjustment after import.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border rounded hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!content.trim() || (preview?.nodeCount === 0)}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Import
          </button>
        </div>
      </div>
    </div>
  );
}
