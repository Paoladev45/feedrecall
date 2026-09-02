import { mkdtemp, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { importTwitterLibrary } from "../src/importers/twitter-library.js"
import { Vault } from "../src/storage/vault.js"

const openVaults: Vault[] = []

afterEach(() => {
  for (const vault of openVaults.splice(0)) vault.close()
})

function fixture() {
  return {
    schema_version: 2,
    built_at: "2026-08-26T13:29:50+00:00",
    counts: { total: 1, triaged: 1, with_media: 1 },
    facets: {},
    records: {
      "tweet-1": {
        _search: "roblox mcp",
        author: "example",
        author_name: "Example Author",
        capture_status: "public-metadata",
        captured_at: "2026-08-21",
        category: "Game dev, Roblox et VFX",
        cluster: "C01",
        decision: "garder",
        engagement: {},
        external_links: ["https://github.com/example/project"],
        id: "tweet-1",
        interest: "high",
        language: "en",
        media: [
          {
            type: "photo",
            src: "https://pbs.twimg.com/media/example.jpg",
            duration: 0,
            w: 640,
            h: 360,
          },
        ],
        priority: "A",
        project_signals: {},
        projects: ["roblox-ai-vfx-lab"],
        projects_rules: [],
        provenance: [],
        published_at: "2026-08-20T10:00:00.000Z",
        reason: "",
        summary: "Roblox MCP workflow",
        tags: ["roblox", "mcp"],
        text: "A useful workflow for Roblox agents.",
        triaged: true,
        url: "https://x.com/example/status/1",
      },
    },
  }
}

describe("Twitter library import", () => {
  it("maps a local library into reviewed, project-aware memories", async () => {
    // Given: a library.json v2 snapshot with one classified post and one media item.
    const directory = await mkdtemp(path.join(tmpdir(), "feedrecall-twitter-library-"))
    const file = path.join(directory, "library.json")
    await writeFile(file, JSON.stringify(fixture()), "utf8")
    const vault = new Vault(path.join(directory, "vault.db"))
    openVaults.push(vault)

    // When: the local snapshot is imported.
    const report = await importTwitterLibrary(vault, file)

    // Then: the record, source links, media, dates, and project signals are preserved.
    expect(report).toEqual({
      inserted: 1,
      updated: 0,
      unchanged: 0,
      sourceRecords: 1,
      recordsWithMedia: 1,
      mediaItems: 1,
      externalLinks: 1,
      categories: [{ category: "Game dev, Roblox et VFX", count: 1 }],
    })
    const record = vault.get("x:like:tweet-1")
    expect(record?.processing.status).toBe("reviewed")
    expect(record?.classification.priority).toBe(5)
    expect(record?.classification.topics).toEqual(
      expect.arrayContaining([
        "Game dev",
        "Roblox et VFX",
        "roblox",
        "mcp",
        "project:roblox-ai-vfx-lab",
      ]),
    )
    expect(record?.knowledge.summary).toBe("Roblox MCP workflow")
    expect(record?.content.external_links).toEqual(["https://github.com/example/project"])
    expect(record?.content.media).toEqual(["https://pbs.twimg.com/media/example.jpg"])
    expect(record?.firstSeenAt).toBe("2026-08-21T00:00:00.000Z")
    expect(record?.lastSeenAt).toBe("2026-08-26T13:29:50.000Z")
  })

  it("is idempotent while treating a newer snapshot as an update", async () => {
    // Given: the same source is exported twice at different snapshot times.
    const directory = await mkdtemp(path.join(tmpdir(), "feedrecall-twitter-repeat-"))
    const file = path.join(directory, "library.json")
    const snapshot = fixture()
    await writeFile(file, JSON.stringify(snapshot), "utf8")
    const vault = new Vault(path.join(directory, "vault.db"))
    openVaults.push(vault)
    await importTwitterLibrary(vault, file)

    // When: the second snapshot advances only its build time.
    snapshot.built_at = "2026-08-27T13:29:50+00:00"
    await writeFile(file, JSON.stringify(snapshot), "utf8")
    const report = await importTwitterLibrary(vault, file)

    // Then: no duplicate is created and first-seen history remains stable.
    expect(report.inserted).toBe(0)
    expect(report.updated).toBe(1)
    expect(vault.search({ query: "", limit: 10 })).toHaveLength(1)
    expect(vault.get("x:like:tweet-1")?.firstSeenAt).toBe("2026-08-21T00:00:00.000Z")
    expect(vault.get("x:like:tweet-1")?.lastSeenAt).toBe("2026-08-27T13:29:50.000Z")
  })

  it("rejects credentials at the library boundary", async () => {
    // Given: a snapshot containing an unsupported cookie field.
    const directory = await mkdtemp(path.join(tmpdir(), "feedrecall-twitter-secret-"))
    const file = path.join(directory, "unsafe.json")
    const unsafe = { ...fixture(), cookies: { auth_token: "secret" } }
    await writeFile(file, JSON.stringify(unsafe), "utf8")
    const vault = new Vault(path.join(directory, "vault.db"))
    openVaults.push(vault)

    // When / Then: the boundary refuses the file before writing a memory.
    await expect(importTwitterLibrary(vault, file)).rejects.toThrow()
    expect(vault.search({ query: "", limit: 10 })).toHaveLength(0)
  })
})
