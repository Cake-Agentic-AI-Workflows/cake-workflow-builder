import { NextResponse } from 'next/server';

const REPO = 'Cake-Agentic-AI-Workflows/cake-skills';
const MAX_CONTENT_SIZE = 100 * 1024; // 100KB limit

export async function GET(request: Request, { params }: { params: { slug: string } }) {
  const { slug } = params;

  // Validate slug to prevent path traversal
  if (!/^[a-zA-Z0-9_-]+$/.test(slug)) {
    return NextResponse.json({ error: 'Invalid skill slug' }, { status: 400 });
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'GitHub token not configured' }, { status: 500 });
  }

  try {
    const res = await fetch(
      `https://raw.githubusercontent.com/${REPO}/main/skills/${slug}/SKILL.md`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        next: { revalidate: 3600 }, // Cache for 1 hour
      }
    );

    if (!res.ok) {
      return NextResponse.json({ error: `Failed to fetch skill: ${res.status}` }, { status: res.status });
    }

    const content = await res.text();
    if (content.length > MAX_CONTENT_SIZE) {
      return NextResponse.json({ error: 'Skill content exceeds size limit' }, { status: 400 });
    }

    return NextResponse.json({ content });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
