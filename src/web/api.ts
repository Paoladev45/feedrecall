import { z } from "zod"
import type {
  Memory,
  ObsolescenceResult,
  Project,
  Stats,
  Timeline,
  TimelineDateField,
  TimelineGroupBy,
} from "./types.js"

const MemorySchema: z.ZodType<Memory> = z.object({
  id: z.string(),
  source: z.object({
    platform: z.string(),
    type: z.string(),
    url: z.string(),
    author: z.string(),
    published_at: z.string().nullable(),
  }),
  content: z.object({
    title: z.string(),
    text: z.string(),
    external_links: z.array(z.string()),
    media: z.array(z.string()),
  }),
  classification: z.object({ topics: z.array(z.string()), priority: z.number() }),
  knowledge: z.object({ summary: z.string().nullable(), possibleUses: z.array(z.string()) }),
  processing: z.object({ status: z.string() }),
  evidence: z.object({ status: z.string(), confidence: z.number() }),
  decision: z.object({ status: z.string(), reason: z.string().nullable() }),
  firstSeenAt: z.string(),
  lastSeenAt: z.string(),
  relevance: z.array(
    z.object({
      projectSlug: z.string(),
      projectName: z.string(),
      score: z.number(),
      reasons: z.array(z.string()),
    }),
  ),
})

const StatsSchema: z.ZodType<Stats> = z.object({
  memories: z.number(),
  projects: z.number(),
  needsReview: z.number(),
  tested: z.number(),
})

const ProjectSchema: z.ZodType<Project> = z.object({
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  goals: z.array(z.string()),
  technologies: z.array(z.string()),
  repositories: z.array(z.string()),
  status: z.enum(["idea", "active", "paused", "completed"]),
})

const MemoryResponseSchema = z.object({ memory: MemorySchema }).transform(({ memory }) => memory)

const TimelineSchema: z.ZodType<Timeline> = z.object({
  dateField: z.enum(["published", "first_seen", "last_seen"]),
  groupBy: z.enum(["day", "week", "month"]),
  project: z.string().nullable(),
  total: z.number(),
  groups: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      items: z.array(z.object({ date: z.string(), memory: MemorySchema })),
    }),
  ),
  undated: z.array(z.object({ date: z.null(), memory: MemorySchema })),
})

const ObsolescenceAssessmentSchema = z
  .object({
    memoryId: z.string(),
    title: z.string(),
    sourceUrl: z.string(),
    publishedAt: z.string().nullable(),
    dateBasis: z.enum(["published", "first_seen"]),
    ageDays: z.number(),
    freshnessWindowDays: z.number(),
    status: z.enum(["fresh", "watch", "likely_expired", "likely_replaced"]),
    recommendation: z.enum(["keep", "review", "archive_candidate"]),
    confidence: z.number(),
    reasons: z.array(z.string()),
    relatedMemoryId: z.string().optional(),
    relatedTitle: z.string().optional(),
  })
  .transform((assessment) => ({
    ...assessment,
    relatedMemoryId: assessment.relatedMemoryId,
    relatedTitle: assessment.relatedTitle,
  }))

const ObsolescenceSchema: z.ZodType<ObsolescenceResult> = z.object({
  asOf: z.string(),
  assessments: z.array(ObsolescenceAssessmentSchema),
  counts: z.object({
    fresh: z.number(),
    watch: z.number(),
    likely_expired: z.number(),
    likely_replaced: z.number(),
  }),
})

async function getJson<T>(url: string, schema: z.ZodType<T>, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, signal ? { signal } : undefined)
  if (!response.ok) throw new Error(`Request failed: ${response.status}`)
  return schema.parse(await response.json())
}

export const api = {
  stats: (signal?: AbortSignal) => getJson("/api/stats", StatsSchema, signal),
  projects: (signal?: AbortSignal) => getJson("/api/projects", z.array(ProjectSchema), signal),
  memories: (query: string, evidence: string, signal?: AbortSignal) => {
    const params = new URLSearchParams()
    if (query) params.set("q", query)
    if (evidence) params.set("evidence", evidence)
    return getJson(`/api/memories?${params.toString()}`, z.array(MemorySchema), signal)
  },
  memory: (id: string, signal?: AbortSignal) =>
    getJson(`/api/memories/${encodeURIComponent(id)}`, MemoryResponseSchema, signal),
  timeline: (dateField: TimelineDateField, groupBy: TimelineGroupBy, signal?: AbortSignal) => {
    const params = new URLSearchParams({ date_field: dateField, group_by: groupBy, limit: "500" })
    return getJson(`/api/timeline?${params.toString()}`, TimelineSchema, signal)
  },
  obsolescence: (signal?: AbortSignal) =>
    getJson("/api/obsolescence?limit=500", ObsolescenceSchema, signal),
  refreshRelevance: async (id: string) => {
    const response = await fetch(`/api/memories/${encodeURIComponent(id)}/refresh-relevance`, {
      method: "POST",
    })
    if (!response.ok) throw new Error(`Request failed: ${response.status}`)
  },
}
