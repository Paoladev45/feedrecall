import Database from "better-sqlite3"
import { z } from "zod"
import {
  evidenceStatuses,
  type MemoryRecord,
  type Project,
  ProjectSchema,
  type Relevance,
} from "../model.js"
import type { ObsolescenceInput, ObsolescenceResult } from "../obsolescence.js"
import { assessObsolescence } from "../obsolescence.js"
import type { TimelineResult } from "../timeline.js"
import { buildTimeline, resolveTimelineInput } from "../timeline.js"
import { markMemory, memoryEvents, saveSnapshot, vaultStats } from "./lifecycle.js"
import { memoryValues, writeMemory } from "./memory-write.js"
import {
  findMemory,
  listMemories,
  relevanceFor,
  searchMemories,
  timelineMemories,
} from "./queries.js"
import { calculateRelevance } from "./relevance.js"
import { toProject } from "./rows.js"
import { schema } from "./schema.js"
import type {
  ImportCounts,
  LifecycleEvent,
  MarkInput,
  SearchInput,
  TimelineInput,
  VaultStats,
} from "./types.js"

export type { ImportCounts, LifecycleEvent, MarkInput, SearchInput, VaultStats } from "./types.js"

const evidenceRank = new Map(evidenceStatuses.map((status, index) => [status, index]))

export class Vault {
  readonly #database: Database.Database

  constructor(databasePath: string) {
    this.#database = new Database(databasePath)
    this.#database.exec(schema)
    const ftsEnabled = this.#database
      .prepare("SELECT sqlite_compileoption_used('ENABLE_FTS5') AS enabled")
      .get() as { enabled: number }
    if (ftsEnabled.enabled !== 1) throw new Error("SQLite FTS5 is required")
  }

  close(): void {
    this.#database.close()
  }

  upsert(record: MemoryRecord): "inserted" | "updated" | "unchanged" {
    const current = this.#database
      .prepare("SELECT last_seen_at, evidence_status, confidence FROM memories WHERE id = ?")
      .get(record.id) as
      | {
          last_seen_at: string
          evidence_status: MemoryRecord["evidence"]["status"]
          confidence: number
        }
      | undefined
    const status = current
      ? current.last_seen_at === record.lastSeenAt
        ? "unchanged"
        : "updated"
      : "inserted"
    if (status === "unchanged") return status
    const firstSeenAt = current ? this.#firstSeen(record.id) : record.firstSeenAt
    const incomingRank = evidenceRank.get(record.evidence.status) ?? 0
    const currentRank = current ? (evidenceRank.get(current.evidence_status) ?? 0) : -1
    const evidence =
      current && currentRank > incomingRank
        ? { status: current.evidence_status, confidence: current.confidence }
        : record.evidence
    writeMemory(this.#database, record, memoryValues({ ...record, evidence }, firstSeenAt))
    return status
  }

  get(id: string): MemoryRecord | null {
    return findMemory(this.#database, id, this.#relevance(id))
  }

  search(input: SearchInput): readonly MemoryRecord[] {
    return searchMemories(this.#database, input, (id) => this.#relevance(id))
  }

  timeline(input: TimelineInput = {}): TimelineResult {
    const resolved = resolveTimelineInput(input)
    const memories = timelineMemories(this.#database, resolved, (id) => this.#relevance(id))
    return buildTimeline(memories, resolved)
  }

  obsolescence(input: ObsolescenceInput = {}): ObsolescenceResult {
    const limit = input.limit ?? 500
    return assessObsolescence(
      listMemories(this.#database, limit, (id) => this.#relevance(id)),
      input,
    )
  }

  saveProject(input: Project): void {
    const project = ProjectSchema.parse(input)
    this.#database
      .prepare(`
      INSERT INTO projects (slug, name, description, goals, technologies, repositories, status)
      VALUES (@slug, @name, @description, @goals, @technologies, @repositories, @status)
      ON CONFLICT(slug) DO UPDATE SET name=excluded.name, description=excluded.description,
        goals=excluded.goals, technologies=excluded.technologies,
        repositories=excluded.repositories, status=excluded.status
    `)
      .run({
        ...project,
        goals: JSON.stringify(project.goals),
        technologies: JSON.stringify(project.technologies),
        repositories: JSON.stringify(project.repositories),
      })
  }

  projects(): readonly Project[] {
    return this.#database
      .prepare("SELECT * FROM projects ORDER BY status, name")
      .all()
      .map(toProject)
  }

  refreshRelevance(memoryId: string): readonly Relevance[] {
    const memory = this.get(memoryId)
    if (!memory) throw new Error(`Memory not found: ${memoryId}`)
    const scores = calculateRelevance(memory, this.projects())

    this.#database.transaction(() => {
      this.#database.prepare("DELETE FROM relevance WHERE memory_id = ?").run(memoryId)
      const insert = this.#database.prepare(
        "INSERT INTO relevance (memory_id, project_slug, score, reasons) VALUES (?, ?, ?, ?)",
      )
      for (const item of scores)
        insert.run(memoryId, item.projectSlug, item.score, JSON.stringify(item.reasons))
    })()
    return scores
  }

  mark(id: string, input: MarkInput): void {
    const memory = this.get(id)
    if (!memory) throw new Error(`Memory not found: ${id}`)
    markMemory(this.#database, memory, input)
  }

  events(id: string): readonly LifecycleEvent[] {
    return memoryEvents(this.#database, id)
  }

  snapshot(connector: string, capturedAt: string, counts: ImportCounts): void {
    saveSnapshot(this.#database, connector, capturedAt, counts)
  }

  saveEnrichment(
    id: string,
    input: {
      readonly summary: string
      readonly topics: readonly string[]
      readonly possibleUses: readonly string[]
    },
  ): void {
    const memory = this.get(id)
    if (!memory) throw new Error(`Memory not found: ${id}`)
    const topics = [...new Set([...memory.classification.topics, ...input.topics])]
    this.#database.transaction(() => {
      this.#database
        .prepare(`
          INSERT INTO memory_knowledge (memory_id, summary, possible_uses)
          VALUES (?, ?, ?)
          ON CONFLICT(memory_id) DO UPDATE SET
            summary = excluded.summary,
            possible_uses = excluded.possible_uses
        `)
        .run(id, input.summary, JSON.stringify(input.possibleUses))
      this.#database
        .prepare("UPDATE memories SET topics = ? WHERE id = ?")
        .run(JSON.stringify(topics), id)
      this.#database.prepare("DELETE FROM memories_fts WHERE memory_id = ?").run(id)
      this.#database
        .prepare(
          "INSERT INTO memories_fts (memory_id, title, body, author, topics) VALUES (?, ?, ?, ?, ?)",
        )
        .run(
          id,
          memory.content.title,
          `${memory.content.text} ${input.summary}`,
          memory.source.author,
          topics.join(" "),
        )
    })()
  }

  stats(): VaultStats {
    return vaultStats(this.#database)
  }

  #firstSeen(id: string): string {
    const row = z
      .object({ first_seen_at: z.string() })
      .parse(this.#database.prepare("SELECT first_seen_at FROM memories WHERE id = ?").get(id))
    return row.first_seen_at
  }

  #relevance(id: string): readonly Relevance[] {
    return relevanceFor(this.#database, id)
  }
}
