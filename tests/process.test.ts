import { mkdtemp } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { type Enricher, processVault } from "../src/enrichment/process.js"
import { type ImportedRecord, materializeRecord } from "../src/model.js"
import { Vault } from "../src/storage/vault.js"

const openVaults: Vault[] = []

afterEach(() => {
  for (const vault of openVaults.splice(0)) vault.close()
})

const source: ImportedRecord = {
  source: {
    platform: "web",
    type: "saved",
    external_id: "local-enrichment",
    url: "https://example.com/local-enrichment",
    author: "Example",
    published_at: "2026-08-13T08:00:00.000Z",
  },
  content: {
    title: "Local agent memory",
    text: "A project-aware memory server with local inference.",
    external_links: [],
    media: [],
  },
  classification: { topics: ["memory"], priority: 3 },
  evidence: { status: "claimed", confidence: 0.4 },
}

describe("processing pipeline", () => {
  it("stores local enrichment and advances processing without changing evidence", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "feedrecall-process-"))
    const vault = new Vault(path.join(directory, "vault.db"))
    openVaults.push(vault)
    const record = materializeRecord(source, "2026-08-13T09:00:00.000Z")
    vault.upsert(record)
    const enricher: Enricher = {
      enrich: async () => ({
        summary: "A local memory service shared by coding agents.",
        topics: ["mcp", "agents"],
        possible_uses: ["Share project decisions across clients"],
      }),
    }

    const counts = await processVault(vault, enricher, { limit: 10, model: "test-local" })

    const processed = vault.get(record.id)
    expect(counts).toEqual({ processed: 1, skipped: 0 })
    expect(processed?.processing.status).toBe("enriched")
    expect(processed?.evidence.status).toBe("claimed")
    expect(processed?.knowledge.summary).toBe("A local memory service shared by coding agents.")
    expect(processed?.classification.topics).toEqual(["memory", "mcp", "agents"])
    expect(processed?.knowledge.possibleUses).toEqual(["Share project decisions across clients"])
  })
})
