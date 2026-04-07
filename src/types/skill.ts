export interface SkillMeta {
  name: string;
  description: string;
  slug: string; // directory name, e.g., "cake"
}

export interface SkillCache {
  skills: SkillMeta[];
  timestamp: number;
}
