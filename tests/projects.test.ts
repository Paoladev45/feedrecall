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

describe("project relevance", () => {
  it("scores transparent topic and technology overlaps", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "feedrecall-project-"))
    const vault = new Vault(path.join(directory, "vault.db"))
    openVaults.push(vault)
    vault.saveProject({
      slug: "studio-agent",
      name: "Studio Agent",
      description: "AI tooling for Roblox Studio",
      goals: ["connect agents to Studio"],
      technologies: ["roblox", "mcp", "luau"],
      repositories: [],
      status: "active",
    })
    const imported: ImportedRecord = {
      source: {
        platform: "x",
        type: "like",
        external_id: "bridge",
        url: "https://example.com/bridge",
        author: "Builder",
        published_at: "2026-08-10T00:00:00.000Z",
      },
      content: {
        title: "Roblox Studio MCP bridge",
        text: "Typed Luau tools for AI agents",
        external_links: [],
        media: [],
      },
      classification: { topics: ["roblox", "mcp", "agents"], priority: 4 },
      evidence: { status: "verified", confidence: 0.8 },
    }
    const record = materializeRecord(imported, "2026-08-13T00:00:00.000Z")
    vault.upsert(record)

    const relevance = vault.refreshRelevance(record.id)

    expect(relevance[0]?.projectSlug).toBe("studio-agent")
    expect(relevance[0]?.score).toBeGreaterThanOrEqual(0.7)
    expect(relevance[0]?.reasons).toContain("topic:roblox")
  })
})
