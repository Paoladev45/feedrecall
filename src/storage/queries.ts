import type Database from "better-sqlite3"
import { z } from "zod"
import type { MemoryRecord, Relevance } from "../model.js"
import { toMemory, toRelevance } from "./rows.js"
import type { SearchInput } from "./types.js"

export function findMemory(
  database: Database.Database,
  id: string,
  relevance: readonly Relevance[],
): MemoryRecord | null {
  const row = database.prepare("SELECT * FROM memories WHERE id = ?").get(id)
  const knowledge = database
    .prepare("SELECT summary, possible_uses FROM memory_knowledge WHERE memory_id = ?")
    .get(id)
  return row ? toMemory(row, relevance, knowledge) : null
}

export function searchMemories(
  database: Database.Database,
  input: SearchInput,
  relevanceFor: (id: string) => readonly Relevance[],
): readonly MemoryRecord[] {
  const conditions: string[] = []
  const parameters: Record<string, string | number> = { limit: Math.min(input.limit ?? 25, 100) }
  let join = ""
  const query = input.query.trim()
  if (query) {
    const terms = query.match(/[\p{L}\p{N}_]+/gu) ?? []
    if (terms.length === 0) return []
    join += " JOIN memories_fts f ON f.memory_id = m.id"
    conditions.push("memories_fts MATCH @query")
    parameters["query"] = terms.map((term) => `"${term}"*`).join(" AND ")
  }
  if (input.project) {
    join += " JOIN relevance r_filter ON r_filter.memory_id = m.id"
    conditions.push("r_filter.project_slug = @project")
    parameters["project"] = input.project
  }
  if (input.evidence) {
    conditions.push("m.evidence_status = @evidence")
    parameters["evidence"] = input.evidence
  }
  if (input.publishedAfter) {
    conditions.push("m.published_at >= @published_after")
    parameters["published_after"] = input.publishedAfter
  }
  if (input.publishedBefore) {
    conditions.push("m.published_at <= @published_before")
    parameters["published_before"] = input.publishedBefore
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""
  const rows = database
    .prepare(`
      SELECT DISTINCT m.* FROM memories m${join} ${where}
      ORDER BY COALESCE(m.published_at, m.first_seen_at) DESC LIMIT @limit
    `)
    .all(parameters)
  return rows.map((row) => {
    const parsed = z.object({ id: z.string() }).parse(row)
    return toMemory(row, relevanceFor(parsed.id))
  })
}

export function relevanceFor(database: Database.Database, id: string): readonly Relevance[] {
  return database
    .prepare(`
      SELECT r.project_slug, p.name project_name, r.score, r.reasons
      FROM relevance r JOIN projects p ON p.slug = r.project_slug
      WHERE r.memory_id = ? ORDER BY r.score DESC
    `)
    .all(id)
    .map(toRelevance)
}
