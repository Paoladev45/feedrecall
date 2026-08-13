import { z } from "zod"

export const platforms = ["x", "github", "youtube", "reddit", "hackernews", "web", "local"] as const
export const sourceTypes = ["like", "bookmark", "repost", "star", "saved", "manual"] as const
export const processingStatuses = ["captured", "enriched", "reviewed", "archived"] as const
export const evidenceStatuses = ["claimed", "observed", "verified", "tested"] as const
export const decisionStatuses = ["undecided", "adopted", "rejected", "replaced"] as const

const DateTime = z.iso.datetime({ offset: true })
const Url = z.url()

export const ImportedRecordSchema = z.strictObject({
  source: z.strictObject({
    platform: z.enum(platforms),
    type: z.enum(sourceTypes),
    external_id: z.string().trim().min(1).max(300),
    url: Url,
    author: z.string().trim().min(1).max(300),
    published_at: DateTime.nullable(),
  }),
  content: z.strictObject({
    title: z.string().trim().min(1).max(500),
    text: z.string().trim().max(100_000),
    external_links: z.array(Url).max(100),
    media: z.array(Url).max(100),
  }),
  classification: z.strictObject({
    topics: z.array(z.string().trim().min(1).max(80)).max(40),
    priority: z.number().int().min(1).max(5),
  }),
  evidence: z.strictObject({
    status: z.enum(evidenceStatuses),
    confidence: z.number().min(0).max(1),
  }),
})

export const ImportEnvelopeSchema = z.strictObject({
  version: z.literal(1),
  captured_at: DateTime,
  records: z.array(ImportedRecordSchema).max(50_000),
})

export const ProjectSchema = z.strictObject({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(4_000),
  goals: z.array(z.string().trim().min(1).max(500)).max(40),
  technologies: z.array(z.string().trim().min(1).max(80)).max(100),
  repositories: z.array(Url).max(40),
  status: z.enum(["idea", "active", "paused", "completed"]),
})

export const ProjectEnvelopeSchema = z.strictObject({
  version: z.literal(1),
  projects: z.array(ProjectSchema).max(10_000),
})

export type ImportedRecord = z.infer<typeof ImportedRecordSchema>
export type ImportEnvelope = z.infer<typeof ImportEnvelopeSchema>
export type Project = z.infer<typeof ProjectSchema>
export type ProcessingStatus = (typeof processingStatuses)[number]
export type EvidenceStatus = (typeof evidenceStatuses)[number]
export type DecisionStatus = (typeof decisionStatuses)[number]

export type Relevance = {
  readonly projectSlug: string
  readonly projectName: string
  readonly score: number
  readonly reasons: readonly string[]
}

export type MemoryRecord = {
  readonly id: string
  readonly source: ImportedRecord["source"]
  readonly content: ImportedRecord["content"]
  readonly classification: ImportedRecord["classification"]
  readonly knowledge: {
    readonly summary: string | null
    readonly possibleUses: readonly string[]
  }
  readonly processing: { readonly status: ProcessingStatus }
  readonly evidence: ImportedRecord["evidence"]
  readonly decision: { readonly status: DecisionStatus; readonly reason: string | null }
  readonly firstSeenAt: string
  readonly lastSeenAt: string
  readonly relevance: readonly Relevance[]
}

export function materializeRecord(record: ImportedRecord, capturedAt: string): MemoryRecord {
  return {
    id: `${record.source.platform}:${record.source.type}:${record.source.external_id}`,
    source: record.source,
    content: record.content,
    classification: record.classification,
    knowledge: { summary: null, possibleUses: [] },
    processing: { status: "captured" },
    evidence: record.evidence,
    decision: { status: "undecided", reason: null },
    firstSeenAt: capturedAt,
    lastSeenAt: capturedAt,
    relevance: [],
  }
}
