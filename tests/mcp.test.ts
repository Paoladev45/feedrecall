import { mkdtemp } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js"
import { afterEach, describe, expect, it } from "vitest"
import { createMcpServer } from "../src/mcp/server.js"
import { toolDefinitions } from "../src/mcp/tools.js"
import { type ImportedRecord, materializeRecord } from "../src/model.js"
import { Vault } from "../src/storage/vault.js"

const openVaults: Vault[] = []

afterEach(() => {
  for (const vault of openVaults.splice(0)) vault.close()
})

describe("MCP contract", () => {
  it("marks search tools read-only and state tools as writes", () => {
    const search = toolDefinitions.find((tool) => tool.name === "memory_search")
    const mark = toolDefinitions.find((tool) => tool.name === "knowledge_mark")

    expect(search?.annotations).toMatchObject({ readOnlyHint: true, destructiveHint: false })
    expect(mark?.annotations).toMatchObject({ readOnlyHint: false, destructiveHint: false })
  })

  it("lists and calls search through a real in-memory MCP connection", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "feedrecall-mcp-"))
    const vault = new Vault(path.join(directory, "vault.db"))
    openVaults.push(vault)
    const input: ImportedRecord = {
      source: {
        platform: "github",
        type: "star",
        external_id: "mcp-memory",
        url: "https://example.com/mcp-memory",
        author: "Example",
        published_at: "2026-08-13T08:00:00.000Z",
      },
      content: {
        title: "MCP project memory",
        text: "Local memory shared by agents",
        external_links: [],
        media: [],
      },
      classification: { topics: ["mcp"], priority: 4 },
      evidence: { status: "verified", confidence: 0.8 },
    }
    vault.upsert(materializeRecord(input, "2026-08-13T09:00:00.000Z"))
    vault.saveProject({
      slug: "agent-memory",
      name: "Agent Memory",
      description: "Shared memory for coding agents.",
      goals: ["find relevant discoveries"],
      technologies: ["memory", "mcp"],
      repositories: [],
      status: "active",
    })
    vault.refreshRelevance("github:star:mcp-memory")
    const server = createMcpServer(vault)
    const client = new Client({ name: "feedrecall-test", version: "1.0.0" })
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()

    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)])
    try {
      const tools = await client.listTools()
      const response = await client.callTool({ name: "memory_search", arguments: { query: "MCP" } })

      expect(tools.tools.map((tool) => tool.name)).toEqual(
        expect.arrayContaining([
          "memory_search",
          "memory_recall",
          "memory_context_pack",
          "memory_timeline",
        ]),
      )
      expect(JSON.stringify(response)).toContain("MCP project memory")

      const recallResponse = await client.callTool({
        name: "memory_recall",
        arguments: { query: "project memory" },
      })
      expect(JSON.stringify(recallResponse)).toContain("MCP project memory")

      const contextResponse = await client.callTool({
        name: "memory_context_pack",
        arguments: { project: "agent-memory", limit: 1 },
      })
      expect(JSON.stringify(contextResponse)).toContain("# Agent Memory")

      const timelineResponse = await client.callTool({
        name: "memory_timeline",
        arguments: { date_field: "published", group_by: "day" },
      })
      expect(JSON.stringify(timelineResponse)).toContain('"2026-08-13"')
    } finally {
      await client.close()
      await server.close()
    }
  })
})
