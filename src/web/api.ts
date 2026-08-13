import { z } from "zod"
import type { Memory, Stats } from "./types.js"

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

async function getJson<T>(url: string, schema: z.ZodType<T>, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, signal ? { signal } : undefined)
  if (!response.ok) throw new Error(`Request failed: ${response.status}`)
  return schema.parse(await response.json())
}

export const api = {
  stats: () => getJson("/api/stats", StatsSchema),
  memories: (query: string, evidence: string, signal?: AbortSignal) => {
    const params = new URLSearchParams()
    if (query) params.set("q", query)
    if (evidence) params.set("evidence", evidence)
    return getJson(`/api/memories?${params.toString()}`, z.array(MemorySchema), signal)
  },
  refreshRelevance: async (id: string) => {
    const response = await fetch(`/api/memories/${encodeURIComponent(id)}/refresh-relevance`, {
      method: "POST",
    })
    if (!response.ok) throw new Error(`Request failed: ${response.status}`)
  },
}
