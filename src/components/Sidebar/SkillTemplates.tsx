'use client';

import { useState, useEffect } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { fetchSkillsList, fetchSkillContent } from '@/lib/githubSkills';
import { parseSkillMd } from '@/lib/skillParser';
import { useWorkflowStore } from '@/store/workflowStore';
import type { SkillMeta } from '@/types/skill';

export function SkillTemplates() {
  const [skills, setSkills] = useState<SkillMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingSlug, setLoadingSlug] = useState<string | null>(null);
  const loadWorkflow = useWorkflowStore((s) => s.loadWorkflow);
  const nodes = useWorkflowStore((s) => s.nodes);

  const fetchSkills = () => {
    setLoading(true);
    setError(null);
    fetchSkillsList()
      .then(setSkills)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSkills();
  }, []);

  const handleLoadSkill = async (slug: string) => {
    // Confirm if there are existing nodes (beyond start/end)
    const hasWork = nodes.length > 2;
    if (hasWork) {
      const confirmed = window.confirm('This will replace your current workflow. Continue?');
      if (!confirmed) return;
    }

    setLoadingSlug(slug);
    try {
      const content = await fetchSkillContent(slug);
      const { nodes, edges, metadata } = parseSkillMd(content);
      loadWorkflow(nodes, edges, metadata);
    } catch (e) {
      alert(`Failed to load skill: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setLoadingSlug(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading templates...
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-destructive">{error}</p>
        <button
          onClick={fetchSkills}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className="w-3 h-3" />
          Retry
        </button>
      </div>
    );
  }

  if (skills.length === 0) {
    return <p className="text-sm text-muted-foreground">No templates available</p>;
  }

  return (
    <div className="space-y-2">
      {skills.map((skill) => (
        <button
          key={skill.slug}
          onClick={() => handleLoadSkill(skill.slug)}
          disabled={loadingSlug === skill.slug}
          className="w-full text-left p-2 rounded-lg border bg-background hover:bg-muted transition-colors disabled:opacity-50"
        >
          <div className="font-medium text-sm">{skill.name}</div>
          <div className="text-xs text-muted-foreground line-clamp-2">{skill.description}</div>
          {loadingSlug === skill.slug && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              Loading...
            </div>
          )}
        </button>
      ))}
    </div>
  );
}
