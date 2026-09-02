import { readFile } from "node:fs/promises"
import { z } from "zod"
import { type ImportedRecord, type MemoryRecord, materializeRecord } from "../model.js"
import type { ImportCounts } from "../storage/types.js"
import type { Vault } from "../storage/vault.js"

const DateLike = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .refine((value) => Number.isFinite(Date.parse(value)), "Expected a valid date")
const OptionalDateLike = z
  .string()
  .trim()
  .max(80)
  .refine(
    (value) => value.length === 0 || Number.isFinite(Date.parse(value)),
    "Expected a valid date",
  )
const JsonObject = z.record(z.string(), z.unknown())

const TwitterMediaSchema = z.strictObject({
  type: z.string().trim().min(1).max(32),
  src: z.url(),
  duration: z.number().nonnegative().nullable().optional(),
  w: z.number().int().nonnegative().nullable().optional(),
  h: z.number().int().nonnegative().nullable().optional(),
})

const TwitterRecordSchema = z.strictObject({
  _search: z.string().optional(),
  author: z.string().trim().min(1).max(300),
  author_name: z.string().trim().max(300).optional(),
  capture_status: z.string().trim().max(80).optional(),
  captured_at: OptionalDateLike.optional(),
  category: z.string().trim().max(500).default(""),
  cluster: z.string().trim().max(80).default(""),
  date: OptionalDateLike.nullable().optional(),
  decision: z.string().trim().max(100).default(""),
  engagement: JsonObject.default({}),
  external_links: z.array(z.url()).max(100).default([]),
  id: z.string().trim().min(1).max(300),
  interest: z.string().trim().max(40).default(""),
  language: z.string().trim().max(40).default(""),
  media: z.array(TwitterMediaSchema).max(100).default([]),
  priority: z.string().trim().max(20).default("C"),
  project_signals: JsonObject.default({}),
  projects: z.array(z.string().trim().min(1).max(120)).max(100).default([]),
  projects_rules: z.array(z.unknown()).max(100).default([]),
  projects_rules_legacy: z.array(z.unknown()).max(100).default([]),
  provenance: z.array(z.unknown()).max(100).default([]),
  published_at: OptionalDateLike.nullable().optional(),
  reason: z.string().trim().max(1_000).default(""),
  summary: z.string().trim().max(500).default(""),
  tags: z.array(z.string().trim().min(1).max(80)).max(100).default([]),
  text: z.string().trim().max(100_000).default(""),
  triaged: z.boolean().default(false),
  url: z.url(),
})

const TwitterLibrarySchema = z.strictObject({
  schema_version: z.literal(2),
  built_at: DateLike,
  counts: JsonObject,
  facets: JsonObject,
  records: z.record(z.string().min(1).max(300), TwitterRecordSchema),
})

type TwitterRecord = z.infer<typeof TwitterRecordSchema>

export type TwitterLibraryImportReport = ImportCounts & {
  readonly sourceRecords: number
  readonly recordsWithMedia: number
  readonly mediaItems: number
  readonly externalLinks: number
  readonly categories: readonly { readonly category: string; readonly count: number }[]
}

const processingOrder = {
  captured: 0,
  enriched: 1,
  reviewed: 2,
  archived: 3,
} as const

const priorityByCode: Readonly<Record<string, number>> = { A: 5, B: 3, C: 1 }

function normalizeDate(value: string): string {
  return new Date(value).toISOString()
}

function uniqueStrings(values: readonly string[]): readonly string[] {
  return [...new Set(values.filter((value) => value.length > 0))]
}

function categoryLabels(category: string): readonly string[] {
  return category
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
}

function titleFor(record: TwitterRecord): string {
  if (record.summary) return record.summary.slice(0, 500)
  const firstLine = record.text.split(/\r?\n/, 1)[0]?.trim() ?? ""
  return (firstLine || `Saved X post ${record.id}`).slice(0, 500)
}

function topicsFor(record: TwitterRecord, current: MemoryRecord | null): readonly string[] {
  return uniqueStrings([
    ...categoryLabels(record.category),
    ...record.tags,
    ...(record.cluster ? [`cluster:${record.cluster}`] : []),
    ...record.projects.map((project) => `project:${project}`),
    ...(current?.classification.topics ?? []),
  ])
}

function priorityFor(record: TwitterRecord, current: MemoryRecord | null): number {
  const incoming = priorityByCode[record.priority.toUpperCase()] ?? 1
  return Math.max(incoming, current?.classification.priority ?? 0)
}

function toImportedRecord(
  record: TwitterRecord,
  builtAt: string,
  current: MemoryRecord | null,
): MemoryRecord {
  const firstSeenAt = normalizeDate(record.captured_at || builtAt)
  const input: ImportedRecord = {
    source: {
      platform: "x",
      type: "like",
      external_id: record.id,
      url: record.url,
      author: record.author,
      published_at: record.published_at ? normalizeDate(record.published_at) : null,
    },
    content: {
      title: titleFor(record),
      text: record.text,
      external_links: [...record.external_links],
      media: record.media.map((item) => item.src),
    },
    classification: {
      topics: [...topicsFor(record, current)],
      priority: priorityFor(record, current),
    },
    evidence: { status: "observed", confidence: 0.5 },
  }
  const materialized = materializeRecord(input, firstSeenAt)
  return {
    ...materialized,
    lastSeenAt: builtAt,
    knowledge: current?.knowledge ?? { summary: null, possibleUses: [] },
    processing: {
      status: current?.processing.status ?? (record.triaged ? "reviewed" : "captured"),
    },
    decision: current?.decision ?? materialized.decision,
  }
}

function uniqueRecords(records: readonly TwitterRecord[]): readonly TwitterRecord[] {
  const byId = new Map<string, TwitterRecord>()
  for (const record of records) {
    if (!byId.has(record.id)) byId.set(record.id, record)
  }
  return [...byId.values()]
}

function promoteTriagedRecord(vault: Vault, id: string): void {
  const current = vault.get(id)
  if (!current || processingOrder[current.processing.status] >= processingOrder.reviewed) return
  vault.mark(id, {
    dimension: "processing",
    status: "reviewed",
    reason: "Imported from a triaged local X library",
  })
}

export async function importTwitterLibrary(
  vault: Vault,
  filePath: string,
): Promise<TwitterLibraryImportReport> {
  const raw: unknown = JSON.parse(await readFile(filePath, "utf8"))
  const library = TwitterLibrarySchema.parse(raw)
  const builtAt = normalizeDate(library.built_at)
  const sourceRecords = Object.values(library.records)
  const records = uniqueRecords(sourceRecords)
  const categoryCounts = new Map<string, number>()
  let inserted = 0
  let updated = 0
  let unchanged = 0
  let recordsWithMedia = 0
  let mediaItems = 0
  let externalLinks = 0

  for (const sourceRecord of records) {
    const category = sourceRecord.category.trim()
    if (category) categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1)
    if (sourceRecord.media.length > 0) recordsWithMedia += 1
    mediaItems += sourceRecord.media.length
    externalLinks += sourceRecord.external_links.length

    const id = `x:like:${sourceRecord.id}`
    const current = vault.get(id)
    const memory = toImportedRecord(sourceRecord, builtAt, current)
    const status = vault.upsert(memory)
    if (status === "inserted") inserted += 1
    else if (status === "updated") updated += 1
    else unchanged += 1

    if (sourceRecord.summary && !current?.knowledge.summary) {
      vault.saveEnrichment(id, { summary: sourceRecord.summary, topics: [], possibleUses: [] })
    }
    if (sourceRecord.triaged) promoteTriagedRecord(vault, id)
  }

  const counts = { inserted, updated, unchanged }
  vault.snapshot("x-library", builtAt, counts)
  return {
    ...counts,
    sourceRecords: sourceRecords.length,
    recordsWithMedia,
    mediaItems,
    externalLinks,
    categories: [...categoryCounts.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([category, count]) => ({ category, count })),
  }
}
