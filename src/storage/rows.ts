import { z } from "zod"
import type { MemoryRecord, Project, Relevance } from "../model.js"

export const MemoryRowSchema = z.object({
  id: z.string(),
  platform: z.string(),
  source_type: z.string(),
  external_id: z.string(),
  source_url: z.string(),
  author: z.string(),
  published_at: z.string().nullable(),
  title: z.string(),
  body: z.string(),
  external_links: z.string(),
  media: z.string(),
  topics: z.string(),
  priority: z.number(),
  processing_status: z.string(),
  evidence_status: z.string(),
  confidence: z.number(),
  decision_status: z.string(),
  decision_reason: z.string().nullable(),
  first_seen_at: z.string(),
  last_seen_at: z.string(),
})

export const ProjectRowSchema = z.object({
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  goals: z.string(),
  technologies: z.string(),
  repositories: z.string(),
  status: z.string(),
})

export const RelevanceRowSchema = z.object({
  project_slug: z.string(),
  project_name: z.string(),
  score: z.number(),
  reasons: z.string(),
})

export const EventRowSchema = z.object({
  dimension: z.string(),
  from_status: z.string(),
  to_status: z.string(),
  reason: z.string().nullable(),
  occurred_at: z.string(),
})

export const KnowledgeRowSchema = z.object({
  summary: z.string(),
  possible_uses: z.string(),
})

const StringListSchema = z.array(z.string())

function strings(value: string): readonly string[] {
  return StringListSchema.parse(JSON.parse(value))
}

export function toProject(value: unknown): Project {
  const row = ProjectRowSchema.parse(value)
  return {
    slug: row.slug,
    name: row.name,
    description: row.description,
    goals: [...strings(row.goals)],
    technologies: [...strings(row.technologies)],
    repositories: [...strings(row.repositories)],
    status: z.enum(["idea", "active", "paused", "completed"]).parse(row.status),
  }
}

export function toRelevance(value: unknown): Relevance {
  const row = RelevanceRowSchema.parse(value)
  return {
    projectSlug: row.project_slug,
    projectName: row.project_name,
    score: row.score,
    reasons: strings(row.reasons),
  }
}

export function toMemory(
  value: unknown,
  relevance: readonly Relevance[],
  knowledgeValue?: unknown,
): MemoryRecord {
  const row = MemoryRowSchema.parse(value)
  const knowledge = knowledgeValue ? KnowledgeRowSchema.parse(knowledgeValue) : null
  return {
    id: row.id,
    source: {
      platform: z
        .enum(["x", "github", "youtube", "reddit", "hackernews", "web", "local"])
        .parse(row.platform),
      type: z
        .enum(["like", "bookmark", "repost", "star", "saved", "manual"])
        .parse(row.source_type),
      external_id: row.external_id,
      url: row.source_url,
      author: row.author,
      published_at: row.published_at,
    },
    content: {
      title: row.title,
      text: row.body,
      external_links: [...strings(row.external_links)],
      media: [...strings(row.media)],
    },
    classification: { topics: [...strings(row.topics)], priority: row.priority },
    knowledge: {
      summary: knowledge?.summary ?? null,
      possibleUses: knowledge ? strings(knowledge.possible_uses) : [],
    },
    processing: {
      status: z.enum(["captured", "enriched", "reviewed", "archived"]).parse(row.processing_status),
    },
    evidence: {
      status: z.enum(["claimed", "observed", "verified", "tested"]).parse(row.evidence_status),
      confidence: row.confidence,
    },
    decision: {
      status: z.enum(["undecided", "adopted", "rejected", "replaced"]).parse(row.decision_status),
      reason: row.decision_reason,
    },
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    relevance,
  }
}
