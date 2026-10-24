import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { checkLiteratureIntegrity, LiteratureCollectionSchema, toSummary } from '../src/literature.js';

const raw = JSON.parse(readFileSync(new URL('../../../docs/data/literature.json', import.meta.url), 'utf8'));

describe('docs/data/literature.json', () => {
  const parsed = LiteratureCollectionSchema.safeParse(raw);

  it('passes the schema for all 17 resources', () => {
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.resources).toHaveLength(17);
  });

  it('has unique ids, known tags, and resolvable navigation and internal links', () => {
    if (!parsed.success) throw new Error('schema failed');
    expect(checkLiteratureIntegrity(parsed.data)).toEqual([]);
  });

  it('gives every resource an original source link and a non-empty summary excerpt', () => {
    if (!parsed.success) throw new Error('schema failed');
    for (const resource of parsed.data.resources) {
      expect(resource.sourceLinks.length).toBeGreaterThan(0);
      expect(toSummary(resource).excerpt.length).toBeGreaterThan(0);
    }
  });

  it('detects a broken collection', () => {
    if (!parsed.success) throw new Error('schema failed');
    const first = parsed.data.resources[0]!;
    const broken = { ...parsed.data, resources: [first, { ...first }, { ...first, id: '00000000-0000-4000-8000-000000000000', tags: ['不存在'] }] };
    const errors = checkLiteratureIntegrity(broken);
    expect(errors.some((e) => e.startsWith('duplicate id'))).toBe(true);
    expect(errors.some((e) => e.includes('unknown tag'))).toBe(true);
  });
});
