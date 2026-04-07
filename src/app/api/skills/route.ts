import { NextResponse } from 'next/server';
import { parseFrontmatter } from '@/lib/skillParser';

const REPO = 'Cake-Agentic-AI-Workflows/cake-skills';
const MAX_CONTENT_SIZE = 100 * 1024; // 100KB limit

export async function GET() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'GitHub token not configured' }, { status: 500 });
  }

  const headers: HeadersInit = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github.v3+json',
  };

  try {
    // Fetch directory listing
    const res = await fetch(`https://api.github.com/repos/${REPO}/contents/skills`, {
      headers,
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!res.ok) {
      return NextResponse.json({ error: `GitHub API error: ${res.status}` }, { status: res.status });
    }

    const items = await res.json();
    if (!Array.isArray(items)) {
      return NextResponse.json({ error: 'Invalid response format' }, { status: 500 });
    }

    // Filter to directories only
    const dirs = items.filter((item: { type: string }) => item.type === 'dir');

    // Fetch each skill's frontmatter
    const results = await Promise.allSettled(
      dirs.map(async (dir: { name: string }) => {
        const skillRes = await fetch(
          `https://raw.githubusercontent.com/${REPO}/main/skills/${dir.name}/SKILL.md`,
          { headers }
        );
        if (!skillRes.ok) throw new Error(`Failed to fetch ${dir.name}`);
        const content = await skillRes.text();
        if (content.length > MAX_CONTENT_SIZE) {
          throw new Error(`Skill ${dir.name} exceeds size limit`);
        }
        const { metadata } = parseFrontmatter(content);
        return {
          name: metadata.name || dir.name,
          description: metadata.description || '',
          slug: dir.name,
        };
      })
    );

    // Extract successful results
    const skills = results
      .filter((r): r is PromiseFulfilledResult<{ name: string; description: string; slug: string }> =>
        r.status === 'fulfilled'
      )
      .map((r) => r.value);

    return NextResponse.json({ skills });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
