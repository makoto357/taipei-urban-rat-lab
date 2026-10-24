import { z } from 'zod';

/**
 * plan.md §7.1：文獻資料是靜態內容（docs/data/literature.json），不存 Firestore。
 * 這裡只定義驗證用 schema；build 時由 apps/web/scripts/build-literature.mts 驗證、
 * sanitize contentHtml 並拆成列表摘要與單篇檔。
 */
export const ResourceTypeSchema = z.enum([
  'review',
  'research_article',
  'technical_manual',
  'program_evaluation',
  'policy_data_inventory',
]);
export type ResourceType = z.infer<typeof ResourceTypeSchema>;

const ExternalLinkSchema = z.object({
  label: z.string(),
  url: z.string().url(),
  href: z.string(),
});
const InternalLinkSchema = z.object({
  label: z.string(),
  resourceId: z.string(),
  sectionId: z.string().optional(),
});
export const LiteratureLinkSchema = z.union([ExternalLinkSchema, InternalLinkSchema]);
export type LiteratureLink = z.infer<typeof LiteratureLinkSchema>;

const SectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  text: z.string(),
  figures: z.array(z.object({
    title: z.string(),
    caption: z.string(),
    accessibleDescriptions: z.array(z.string()),
  }).passthrough()).default([]),
}).passthrough();

export const LiteratureSchema = z.object({
  id: z.string().uuid(),
  resourceType: ResourceTypeSchema,
  tags: z.array(z.string()),
  title: z.string().min(1),
  fullTitle: z.string(),
  authorsText: z.string(),
  year: z.number().int().nullable(),
  publicationText: z.string(),
  doi: z.string().nullable(),
  sourceLinks: z.array(LiteratureLinkSchema).min(1),
  sections: z.array(SectionSchema),
  contentHtml: z.string(),
  researchNotes: z.object({
    text: z.string(),
    fields: z.record(z.string(), z.string()),
  }).nullable(),
  navigation: z.array(z.object({
    relation: z.enum(['previous', 'next']),
    resourceId: z.string(),
    title: z.string(),
  })),
  allLinks: z.array(LiteratureLinkSchema),
}).passthrough();
export type Literature = z.infer<typeof LiteratureSchema>;

export const TagGroupSchema = z.object({ name: z.string(), tags: z.array(z.string()) });

export const LiteratureCollectionSchema = z.object({
  tagGroups: z.array(TagGroupSchema),
  resources: z.array(LiteratureSchema),
}).passthrough();

/** 列表頁只載入摘要（不含 sections、contentHtml）。 */
export const LiteratureSummarySchema = z.object({
  id: z.string(),
  resourceType: ResourceTypeSchema,
  tags: z.array(z.string()),
  title: z.string(),
  fullTitle: z.string(),
  authorsText: z.string(),
  year: z.number().nullable(),
  excerpt: z.string(),
  evidenceType: z.string().nullable(),
});
export type LiteratureSummary = z.infer<typeof LiteratureSummarySchema>;

const EXCERPT_LENGTH = 150;

const clip = (text: string): string => {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > EXCERPT_LENGTH ? `${flat.slice(0, EXCERPT_LENGTH)}…` : flat;
};

/** 有研究摘要的取 Main Findings；台北制度盤點（researchNotes 為 null）改取第二個 section。 */
export const toSummary = (resource: Literature): LiteratureSummary => {
  const fields = resource.researchNotes?.fields;
  const fallback = resource.sections[1]?.text ?? resource.sections[0]?.text ?? '';
  return {
    id: resource.id,
    resourceType: resource.resourceType,
    tags: resource.tags,
    title: resource.title,
    fullTitle: resource.fullTitle,
    authorsText: resource.authorsText,
    year: resource.year,
    excerpt: clip(fields?.['Main Findings'] ?? fallback),
    evidenceType: fields?.['Evidence Type'] ?? null,
  };
};

/**
 * 跨文件完整性檢查（plan.md Phase 8）：id 唯一、標籤都屬於 tagGroups、
 * prev／next 與站內連結指向存在的 id（含 sectionId）。回傳錯誤訊息列表，空陣列代表通過。
 */
export const checkLiteratureIntegrity = (collection: z.infer<typeof LiteratureCollectionSchema>): string[] => {
  const errors: string[] = [];
  const ids = new Set<string>();
  const sectionsById = new Map<string, Set<string>>();
  const knownTags = new Set(collection.tagGroups.flatMap((group) => group.tags));

  for (const resource of collection.resources) {
    if (ids.has(resource.id)) errors.push(`duplicate id ${resource.id}`);
    ids.add(resource.id);
    sectionsById.set(resource.id, new Set(resource.sections.map((section) => section.id)));
    for (const tag of resource.tags) {
      if (!knownTags.has(tag)) errors.push(`${resource.title}: unknown tag ${tag}`);
    }
  }

  for (const resource of collection.resources) {
    for (const nav of resource.navigation) {
      if (!ids.has(nav.resourceId)) errors.push(`${resource.title}: navigation points to missing ${nav.resourceId}`);
    }
    for (const link of [...resource.sourceLinks, ...resource.allLinks]) {
      if (!('resourceId' in link)) continue;
      if (!ids.has(link.resourceId)) {
        errors.push(`${resource.title}: internal link to missing ${link.resourceId}`);
      } else if (link.sectionId && !sectionsById.get(link.resourceId)?.has(link.sectionId)) {
        errors.push(`${resource.title}: internal link to missing section ${link.resourceId}#${link.sectionId}`);
      }
    }
  }
  return errors;
};
