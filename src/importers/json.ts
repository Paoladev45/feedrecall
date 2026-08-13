import { readFile } from "node:fs/promises"
import { ImportEnvelopeSchema, materializeRecord } from "../model.js"
import type { ImportCounts, Vault } from "../storage/vault.js"

export async function importFile(vault: Vault, filePath: string): Promise<ImportCounts> {
  const raw: unknown = JSON.parse(await readFile(filePath, "utf8"))
  const envelope = ImportEnvelopeSchema.parse(raw)
  let inserted = 0
  let updated = 0
  let unchanged = 0
  for (const input of envelope.records) {
    const status = vault.upsert(materializeRecord(input, envelope.captured_at))
    if (status === "inserted") inserted += 1
    else if (status === "updated") updated += 1
    else unchanged += 1
  }
  const counts = { inserted, updated, unchanged }
  vault.snapshot("json", envelope.captured_at, counts)
  return counts
}
