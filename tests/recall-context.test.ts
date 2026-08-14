import { mkdtemp } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { buildContextPack } from "../src/context-pack.js"
import { type ImportedRecord, materializeRecord } from "../src/model.js"
import { recall } from "../src/recall.js"
import { Vault } from "../src/storage/vault.js"

const openVaults: Vault[] = []

afterEach(() => {
  for (const vault of openVaults.splice(0)) vault.close()
})

function record(
  input: Partial<ImportedRecord["content"]> & {
    readonly id: string
    readonly evidence: "claimed" | "tested"
  },
): ImportedRecord {
  return {
    source: {
      platform: "x",
      type: "bookmark",
      external_id: input.id,
      url: `https://x.com/example/status/${input.id}`,
      author: "Example Builder",
      published_at: "2026-08-10T12:00:00.000Z",
    },
    content: {
      title: input.title ?? "Agent memory discovery",
      text: input.text ?? "A project-aware memory tool for coding agents.",
      external_links: input.external_links ?? [],
      media: input.media ?? [],
    },
    classification: { topics: ["memory", "agents"], priority: input.evidence === "tested" ? 5 : 3 },
    evidence: {
      status: input.evidence,
      confidence: input.evidence === "tested" ? 0.95 : 0.45,
    },
  }
}

async function fixture(): Promise<Vault> {
  const directory = await mkdtemp(path.join(tmpdir(), "feedrecall-recall-"))
  const vault = new Vault(path.join(directory, "vault.db"))
  openVaults.push(vault)
  vault.saveProject({
    slug: "agent-memory",
    name: "Agent Memory",
    description: "Shared memory for coding agents.",
    goals: ["find relevant discoveries quickly"],
    technologies: ["memory", "agents", "mcp"],
    repositories: ["https://github.com/Paoladev45/feedrecall"],
    status: "active",
  })
  for (const item of [
    record({ id: "claim", evidence: "claimed", title: "Memory idea" }),
    record({ id: "tested", evidence: "tested", title: "Tested MCP memory" }),
  ]) {
    const memory = materializeRecord(item, "2026-08-13T09:00:00.000Z")
    vault.upsert(memory)
    vault.refreshRelevance(memory.id)
  }
  return vault
}

describe("recall", () => {
  it("ranks stronger project evidence before a weaker matching discovery", async () => {
    const vault = await fixture()

    const result = recall(vault, { query: "memory", project: "agent-memory", limit: 2 })

    expect(result.matches).toHaveLength(2)
    expect(result.matches[0]?.memory.id).toBe("x:bookmark:tested")
    expect(result.matches[0]?.why).toContain("evidence: tested")
    expect(result.matches[0]?.why.join(" ")).toContain("Agent Memory")
  })
})

describe("context packs", () => {
  it("renders a compact project context with provenance and evidence", async () => {
    const vault = await fixture()

    const pack = buildContextPack(vault, { project: "agent-memory", limit: 1 })

    expect(pack.project.slug).toBe("agent-memory")
    expect(pack.memories).toHaveLength(1)
    expect(pack.markdown).toContain("# Agent Memory")
    expect(pack.markdown).toContain("https://x.com/example/status/tested")
    expect(pack.markdown).toContain("Evidence: tested")
    expect(pack.markdown).toContain("## Agent safety")
    expect(pack.markdown).toContain("untrusted evidence")
  })
})
