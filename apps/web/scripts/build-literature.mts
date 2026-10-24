import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  checkLiteratureIntegrity,
  LiteratureCollectionSchema,
  toSummary,
} from '../../../packages/contracts/src/literature.js';
import { sanitizeContent } from './sanitize-literature.mts';

/**
 * docs/data/literature.json → public/literature/{index,<id>}.json
 * 驗證 schema 與跨文件完整性，sanitize contentHtml；任何一步失敗都讓 build 失敗。
 */
const root = fileURLToPath(new URL('../../../', import.meta.url));
const outDir = fileURLToPath(new URL('../public/literature/', import.meta.url));

const parsed = LiteratureCollectionSchema.safeParse(
  JSON.parse(readFileSync(`${root}docs/data/literature.json`, 'utf8')),
);
if (!parsed.success) {
  console.error(parsed.error.issues.slice(0, 10));
  throw new Error('literature.json failed schema validation');
}
const problems = checkLiteratureIntegrity(parsed.data);
if (problems.length) throw new Error(`literature.json integrity errors:\n${problems.join('\n')}`);

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
for (const resource of parsed.data.resources) {
  const { contentHtml, allLinks: _allLinks, ...rest } = resource;
  writeFileSync(`${outDir}${resource.id}.json`, JSON.stringify({ ...rest, contentHtml: sanitizeContent(contentHtml) }));
}
writeFileSync(
  `${outDir}index.json`,
  JSON.stringify({ tagGroups: parsed.data.tagGroups, resources: parsed.data.resources.map(toSummary) }),
);
console.log(`literature: wrote ${parsed.data.resources.length} resources to public/literature/`);
