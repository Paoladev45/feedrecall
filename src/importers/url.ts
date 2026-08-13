import { createHash } from "node:crypto"
import { type ImportedRecord, materializeRecord } from "../model.js"
import type { Vault } from "../storage/vault.js"

export function importUrl(
  vault: Vault,
  value: string,
  capturedAt = new Date().toISOString(),
): string {
  const url = new URL(value)
  url.hash = ""
  const canonical = url.toString()
  const externalId = createHash("sha256").update(canonical).digest("hex").slice(0, 24)
  const input: ImportedRecord = {
    source: {
      platform: "web",
      type: "manual",
      external_id: externalId,
      url: canonical,
      author: url.hostname,
      published_at: null,
    },
    content: { title: canonical, text: "", external_links: [], media: [] },
    classification: { topics: [], priority: 3 },
    evidence: { status: "claimed", confidence: 0.2 },
  }
  const record = materializeRecord(input, capturedAt)
  vault.upsert(record)
  return record.id
}
