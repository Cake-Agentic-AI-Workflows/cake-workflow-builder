// src/test/parser/frontmatter.test.ts
import { describe, it, expect } from 'vitest';
import { parseFrontmatter, parseSkillMd } from '@/lib/skillParser';

describe('Parser: Frontmatter Extraction', () => {
  describe('parseFrontmatter function', () => {
    it('extracts name field', () => {
      const content = `---
name: my-workflow
description: A test
metadata:
  tags:
    - test
  author: Test
  version: "1.0.0"
  user-invocable: true
---

# Content`;
      const { metadata } = parseFrontmatter(content);
      expect(metadata.name).toBe('my-workflow');
    });

    it('extracts description with > syntax', () => {
      const content = `---
name: test
description: >
  This is a multi-line description
  that spans multiple lines
metadata:
  tags:
    - test
  author: Test
  version: "1.0.0"
  user-invocable: true
---

# Content`;
      const { metadata } = parseFrontmatter(content);
      expect(metadata.description).toContain('multi-line');
    });

    it('extracts author field', () => {
      const content = `---
name: test
description: Test
metadata:
  tags:
    - test
  author: John Doe
  version: "1.0.0"
  user-invocable: true
---

# Content`;
      const { metadata } = parseFrontmatter(content);
      expect(metadata.author).toBe('John Doe');
    });

    it('extracts version with quotes', () => {
      const content = `---
name: test
description: Test
metadata:
  tags:
    - test
  author: Test
  version: "2.5.0"
  user-invocable: true
---

# Content`;
      const { metadata } = parseFrontmatter(content);
      expect(metadata.version).toBe('2.5.0');
    });

    it('extracts version without quotes', () => {
      const content = `---
name: test
description: Test
metadata:
  tags:
    - test
  author: Test
  version: 1.0.0
  user-invocable: true
---

# Content`;
      const { metadata } = parseFrontmatter(content);
      expect(metadata.version).toBe('1.0.0');
    });

    it('extracts tags array', () => {
      const content = `---
name: test
description: Test
metadata:
  tags:
    - workflow
    - automation
    - testing
  author: Test
  version: "1.0.0"
  user-invocable: true
---

# Content`;
      const { metadata } = parseFrontmatter(content);
      expect(metadata.tags).toEqual(['workflow', 'automation', 'testing']);
    });

    it('extracts user-invocable true', () => {
      const content = `---
name: test
description: Test
metadata:
  tags:
    - test
  author: Test
  version: "1.0.0"
  user-invocable: true
---

# Content`;
      const { metadata } = parseFrontmatter(content);
      expect(metadata.userInvocable).toBe(true);
    });

    it('extracts user-invocable false', () => {
      const content = `---
name: test
description: Test
metadata:
  tags:
    - test
  author: Test
  version: "1.0.0"
  user-invocable: false
---

# Content`;
      const { metadata } = parseFrontmatter(content);
      expect(metadata.userInvocable).toBe(false);
    });

    it('returns body without frontmatter', () => {
      const content = `---
name: test
description: Test
metadata:
  tags:
    - test
  author: Test
  version: "1.0.0"
  user-invocable: true
---

# My Title

Some content here.`;
      const { body } = parseFrontmatter(content);
      expect(body).toContain('# My Title');
      expect(body).toContain('Some content here.');
      expect(body).not.toContain('name: test');
    });
  });

  describe('Missing frontmatter', () => {
    it('returns empty metadata when no frontmatter', () => {
      const content = `# Just Content

No frontmatter here.`;
      const { metadata, body } = parseFrontmatter(content);
      expect(Object.keys(metadata).length).toBe(0);
      expect(body).toBe(content);
    });
  });

  describe('parseSkillMd integration', () => {
    it('uses default metadata for missing fields', () => {
      const content = `---
name: partial
---

### Phase 1: Test

Do something.`;
      const result = parseSkillMd(content);
      expect(result.metadata.name).toBe('partial');
      expect(result.metadata.version).toBe('1.0.0'); // default
      expect(result.metadata.userInvocable).toBe(true); // default
    });
  });
});
