'use client';

import { useState, useMemo } from 'react';
import { X, Download, Copy, AlertCircle, Check, FileArchive } from 'lucide-react';
import { useWorkflowStore } from '@/store/workflowStore';
import { generateSkillMd, validateWorkflow } from '@/lib/skillGenerator';
import { WorkflowMetadata } from '@/types/workflow';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExportModal({ isOpen, onClose }: ExportModalProps) {
  const { nodes, edges, metadata, updateMetadata } = useWorkflowStore();
  const [copied, setCopied] = useState(false);

  const generatedContent = useMemo(() => {
    return generateSkillMd({ nodes, edges, metadata });
  }, [nodes, edges, metadata]);

  const warnings = useMemo(() => {
    return validateWorkflow({ nodes, edges, metadata });
  }, [nodes, edges, metadata]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([generatedContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'SKILL.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPackage = async () => {
    const zip = new JSZip();
    const folderName = metadata.name || 'my-skill';

    // Add SKILL.md
    zip.file(`${folderName}/SKILL.md`, generatedContent);

    // Add references directory (empty placeholder)
    zip.file(`${folderName}/references/.gitkeep`, '');

    // Generate and download
    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, `${folderName}.zip`);
  };

  const updateField = (field: keyof WorkflowMetadata, value: string | string[] | boolean) => {
    updateMetadata({ [field]: value });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card w-full max-w-4xl max-h-[90vh] rounded-lg shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Export Workflow</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Metadata Form */}
          <div className="w-72 p-4 border-r overflow-y-auto">
            <h3 className="text-sm font-medium mb-3">Metadata</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Name</label>
                <input
                  type="text"
                  value={metadata.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  className="w-full mt-1 px-2 py-1.5 border rounded text-sm"
                  placeholder="my-workflow"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Description</label>
                <textarea
                  value={metadata.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  rows={3}
                  className="w-full mt-1 px-2 py-1.5 border rounded text-sm resize-none"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Version</label>
                <input
                  type="text"
                  value={metadata.version}
                  onChange={(e) => updateField('version', e.target.value)}
                  className="w-full mt-1 px-2 py-1.5 border rounded text-sm"
                  placeholder="1.0.0"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Author</label>
                <input
                  type="text"
                  value={metadata.author}
                  onChange={(e) => updateField('author', e.target.value)}
                  className="w-full mt-1 px-2 py-1.5 border rounded text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={metadata.tags.join(', ')}
                  onChange={(e) =>
                    updateField(
                      'tags',
                      e.target.value
                        .split(',')
                        .map((t) => t.trim())
                        .filter(Boolean)
                    )
                  }
                  className="w-full mt-1 px-2 py-1.5 border rounded text-sm"
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={metadata.userInvocable}
                  onChange={(e) => updateField('userInvocable', e.target.checked)}
                  className="rounded"
                />
                User-invocable
              </label>
            </div>

            {/* Warnings */}
            {warnings.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium mb-2 text-yellow-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  Warnings
                </h3>
                <ul className="text-xs text-yellow-600 space-y-1">
                  {warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Preview */}
          <div className="flex-1 p-4 overflow-y-auto">
            <h3 className="text-sm font-medium mb-3">Preview</h3>
            <pre className="text-xs font-mono bg-muted p-4 rounded-lg overflow-x-auto whitespace-pre-wrap">
              {generatedContent}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 text-sm border rounded hover:bg-muted"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-green-500" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy
              </>
            )}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 text-sm border rounded hover:bg-muted"
          >
            <Download className="w-4 h-4" />
            Download SKILL.md
          </button>
          <button
            onClick={handleDownloadPackage}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            <FileArchive className="w-4 h-4" />
            Download Package (.zip)
          </button>
        </div>
      </div>
    </div>
  );
}
