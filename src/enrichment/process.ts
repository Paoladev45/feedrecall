import type { Vault } from "../storage/vault.js"
import type { Enrichment } from "./ollama.js"

export interface Enricher {
  enrich(title: string, text: string, model: string): Promise<Enrichment>
}

export type ProcessOptions = {
  readonly limit: number
  readonly model: string
}

export async function processVault(
  vault: Vault,
  enricher: Enricher,
  options: ProcessOptions,
): Promise<{ readonly processed: number; readonly skipped: number }> {
  const candidates = vault
    .search({ query: "", limit: options.limit })
    .filter((memory) => memory.processing.status === "captured")
  let processed = 0
  let skipped = 0
  for (const memory of candidates) {
    if (!memory.content.title && !memory.content.text) {
      skipped += 1
      continue
    }
    const enrichment = await enricher.enrich(
      memory.content.title,
      memory.content.text,
      options.model,
    )
    vault.saveEnrichment(memory.id, {
      summary: enrichment.summary,
      topics: enrichment.topics,
      possibleUses: enrichment.possible_uses,
    })
    vault.mark(memory.id, {
      dimension: "processing",
      status: "enriched",
      reason: `Locally enriched with ${options.model}`,
    })
    vault.refreshRelevance(memory.id)
    processed += 1
  }
  return { processed, skipped }
}
