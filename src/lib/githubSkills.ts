import type { SkillMeta, SkillCache } from '@/types/skill';

const CACHE_KEY = 'cake-skills-cache';
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

function getCache(): SkillCache | null {
  if (typeof window === 'undefined') return null;
  const cached = localStorage.getItem(CACHE_KEY);
  if (!cached) return null;
  try {
    return JSON.parse(cached) as SkillCache;
  } catch {
    // Corrupted cache, remove it
    localStorage.removeItem(CACHE_KEY);
    return null;
  }
}

export async function fetchSkillsList(): Promise<SkillMeta[]> {
  // Check cache first
  const cache = getCache();
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return cache.skills;
  }

  try {
    const res = await fetch('/api/skills');
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || `API error: ${res.status}`);
    }

    const { skills } = await res.json();

    // Cache results
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ skills, timestamp: Date.now() }));
      } catch {
        // localStorage full, continue without caching
      }
    }

    return skills;
  } catch (error) {
    // On failure, return stale cache if available
    if (cache) {
      return cache.skills;
    }
    throw error;
  }
}

export async function fetchSkillContent(slug: string): Promise<string> {
  const res = await fetch(`/api/skills/${encodeURIComponent(slug)}`);
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || `API error: ${res.status}`);
  }
  const { content } = await res.json();
  return content;
}
