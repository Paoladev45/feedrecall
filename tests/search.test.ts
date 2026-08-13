import { mkdtemp } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { type ImportedRecord, materializeRecord } from "../src/model.js"
import { Vault } from "../src/storage/vault.js"

const openVaults: Vault[] = []

afterEach(() => {
  for (const vault of openVaults.splice(0)) vault.close()
})

const source: ImportedRecord = {
  source: {
    platform: "x",
    type: "bookmark",
    external_id: "memory-tool",
    url: "https://example.com/memory-tool",
    author: "Example",
    published_at: "2026-07-21T12:00:00.000Z",
  },
  content: {
    title: "Agent memory with project routing",
    text: "Routes small knowledge packs to Codex and Claude Code",
    external_links: [],
    media: [],
  },
  classification: { topics: ["memory", "agents"], priority: 4 },
  evidence: { status: "tested", confidence: 0.9 },
}

describe("search", () => {
  it("searches content and filters by publication date", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "feedrecall-search-"))
    const vault = new Vault(path.join(directory, "vault.db"))
    openVaults.push(vault)
    vault.upsert(materializeRecord(source, "2026-08-01T10:00:00.000Z"))

    expect(vault.search({ query: "project routing" })).toHaveLength(1)
    expect(
      vault.search({ query: "memory", publishedAfter: "2026-08-01T00:00:00.000Z" }),
    ).toHaveLength(0)
    expect(
      vault.search({ query: "memory", publishedBefore: "2026-08-01T00:00:00.000Z" }),
    ).toHaveLength(1)
  })

  it("returns no matches for punctuation-bearing or punctuation-only queries", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "feedrecall-search-punctuation-"))
    const vault = new Vault(path.join(directory, "vault.db"))
    openVaults.push(vault)
    vault.upsert(materializeRecord(source, "2026-08-01T10:00:00.000Z"))

    expect(vault.search({ query: "zzzz-no-match" })).toEqual([])
    expect(vault.search({ query: "---" })).toEqual([])
  })

  it("records evidence and decision transitions as events", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "feedrecall-events-"))
    const vault = new Vault(path.join(directory, "vault.db"))
    openVaults.push(vault)
    const id = materializeRecord(source, "2026-08-01T10:00:00.000Z").id
    vault.upsert(materializeRecord(source, "2026-08-01T10:00:00.000Z"))

    vault.mark(id, { dimension: "decision", status: "rejected", reason: "Fails on Windows" })

    expect(vault.get(id)?.decision.status).toBe("rejected")
    expect(vault.events(id)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ dimension: "decision", toStatus: "rejected" }),
      ]),
    )
  })
})
