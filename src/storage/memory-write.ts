import type Database from "better-sqlite3"
import type { MemoryRecord } from "../model.js"

export type MemoryValues = Record<string, string | number | null>

export function memoryValues(record: MemoryRecord, firstSeenAt: string): MemoryValues {
  return {
    id: record.id,
    platform: record.source.platform,
    source_type: record.source.type,
    external_id: record.source.external_id,
    source_url: record.source.url,
    author: record.source.author,
    published_at: record.source.published_at,
    title: record.content.title,
    body: record.content.text,
    external_links: JSON.stringify(record.content.external_links),
    media: JSON.stringify(record.content.media),
    topics: JSON.stringify(record.classification.topics),
    priority: record.classification.priority,
    processing_status: record.processing.status,
    evidence_status: record.evidence.status,
    confidence: record.evidence.confidence,
    decision_status: record.decision.status,
    decision_reason: record.decision.reason,
    first_seen_at: firstSeenAt,
    last_seen_at: record.lastSeenAt,
  }
}

export function writeMemory(
  database: Database.Database,
  record: MemoryRecord,
  values: MemoryValues,
): void {
  database.transaction(() => {
    database
      .prepare(`
        INSERT INTO memories (
          id, platform, source_type, external_id, source_url, author, published_at,
          title, body, external_links, media, topics, priority, processing_status,
          evidence_status, confidence, decision_status, decision_reason, first_seen_at, last_seen_at
        ) VALUES (
          @id, @platform, @source_type, @external_id, @source_url, @author, @published_at,
          @title, @body, @external_links, @media, @topics, @priority, @processing_status,
          @evidence_status, @confidence, @decision_status, @decision_reason, @first_seen_at, @last_seen_at
        ) ON CONFLICT(id) DO UPDATE SET
          source_url = excluded.source_url,
          author = excluded.author,
          published_at = excluded.published_at,
          title = excluded.title,
          body = excluded.body,
          external_links = excluded.external_links,
          media = excluded.media,
          topics = excluded.topics,
          priority = excluded.priority,
          evidence_status = excluded.evidence_status,
          confidence = excluded.confidence,
          last_seen_at = excluded.last_seen_at
      `)
      .run(values)
    database.prepare("DELETE FROM memories_fts WHERE memory_id = ?").run(record.id)
    database
      .prepare(
        "INSERT INTO memories_fts (memory_id, title, body, author, topics) VALUES (?, ?, ?, ?, ?)",
      )
      .run(
        record.id,
        record.content.title,
        record.content.text,
        record.source.author,
        record.classification.topics.join(" "),
      )
  })()
}
