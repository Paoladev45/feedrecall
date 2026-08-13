import type Database from "better-sqlite3"
import { z } from "zod"
import type { MemoryRecord } from "../model.js"
import { EventRowSchema } from "./rows.js"
import type { ImportCounts, LifecycleEvent, MarkInput, VaultStats } from "./types.js"

export function markMemory(
  database: Database.Database,
  memory: MemoryRecord,
  input: MarkInput,
): void {
  const current =
    input.dimension === "processing"
      ? memory.processing.status
      : input.dimension === "evidence"
        ? memory.evidence.status
        : memory.decision.status
  const column =
    input.dimension === "processing"
      ? "processing_status"
      : input.dimension === "evidence"
        ? "evidence_status"
        : "decision_status"

  database.transaction(() => {
    database.prepare(`UPDATE memories SET ${column} = ? WHERE id = ?`).run(input.status, memory.id)
    if (input.dimension === "decision") {
      database
        .prepare("UPDATE memories SET decision_reason = ? WHERE id = ?")
        .run(input.reason, memory.id)
    }
    database
      .prepare(`
        INSERT INTO lifecycle_events (memory_id, dimension, from_status, to_status, reason, occurred_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .run(
        memory.id,
        input.dimension,
        current,
        input.status,
        input.reason,
        new Date().toISOString(),
      )
  })()
}

export function memoryEvents(
  database: Database.Database,
  memoryId: string,
): readonly LifecycleEvent[] {
  return database
    .prepare(
      "SELECT dimension, from_status, to_status, reason, occurred_at FROM lifecycle_events WHERE memory_id = ? ORDER BY id",
    )
    .all(memoryId)
    .map((value) => {
      const row = EventRowSchema.parse(value)
      return {
        dimension: row.dimension,
        fromStatus: row.from_status,
        toStatus: row.to_status,
        reason: row.reason,
        occurredAt: row.occurred_at,
      }
    })
}

export function saveSnapshot(
  database: Database.Database,
  connector: string,
  capturedAt: string,
  counts: ImportCounts,
): void {
  database
    .prepare(`
      INSERT INTO snapshots (connector, captured_at, inserted_count, updated_count, unchanged_count)
      VALUES (?, ?, ?, ?, ?)
    `)
    .run(connector, capturedAt, counts.inserted, counts.updated, counts.unchanged)
}

export function vaultStats(database: Database.Database): VaultStats {
  const row = z
    .object({
      memories: z.number(),
      needs_review: z.number().nullable(),
      tested: z.number().nullable(),
    })
    .parse(
      database
        .prepare(`
          SELECT COUNT(*) memories,
            SUM(CASE WHEN processing_status = 'captured' THEN 1 ELSE 0 END) needs_review,
            SUM(CASE WHEN evidence_status = 'tested' THEN 1 ELSE 0 END) tested
          FROM memories
        `)
        .get(),
    )
  const projects = z
    .object({ count: z.number() })
    .parse(database.prepare("SELECT COUNT(*) count FROM projects").get()).count
  return {
    memories: row.memories,
    projects,
    needsReview: row.needs_review ?? 0,
    tested: row.tested ?? 0,
  }
}
