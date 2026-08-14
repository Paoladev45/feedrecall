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

function record(id: string, publishedAt: string | null): ImportedRecord {
  return {
    source: {
      platform: "x",
      type: "like",
      external_id: id,
      url: `https://x.com/example/status/${id}`,
      author: "Example",
      published_at: publishedAt,
    },
    content: {
      title: `Discovery ${id}`,
      text: "A saved discovery for the timeline.",
      external_links: [],
      media: [],
    },
    classification: { topics: ["memory"], priority: 3 },
    evidence: { status: "claimed", confidence: 0.4 },
  }
}

async function fixture(): Promise<Vault> {
  const directory = await mkdtemp(path.join(tmpdir(), "feedrecall-timeline-"))
  const vault = new Vault(path.join(directory, "vault.db"))
  openVaults.push(vault)
  for (const [id, publishedAt, firstSeenAt] of [
    ["new", "2026-08-13T15:00:00.000Z", "2026-08-14T09:00:00.000Z"],
    ["same-day", "2026-08-13T08:00:00.000Z", "2026-08-15T09:00:00.000Z"],
    ["older", "2026-07-02T10:00:00.000Z", "2026-08-16T09:00:00.000Z"],
    ["undated", null, "2026-08-17T09:00:00.000Z"],
  ] as const) {
    vault.upsert(materializeRecord(record(id, publishedAt), firstSeenAt))
  }
  return vault
}

describe("timeline", () => {
  it("groups published dates by day and preserves undated memories", async () => {
    const vault = await fixture()

    const result = vault.timeline({ dateField: "published", groupBy: "day" })

    expect(result.total).toBe(4)
    expect(result.groups.map((group) => group.key)).toEqual(["2026-08-13", "2026-07-02"])
    expect(result.groups[0]?.items.map((item) => item.memory.id)).toEqual([
      "x:like:new",
      "x:like:same-day",
    ])
    expect(result.undated.map((item) => item.memory.id)).toEqual(["x:like:undated"])
  })

  it("supports week and month grouping plus inclusive date-only bounds", async () => {
    const vault = await fixture()

    const month = vault.timeline({ dateField: "published", groupBy: "month" })
    expect(month.groups.map((group) => group.key)).toEqual(["2026-08", "2026-07"])

    const week = vault.timeline({
      dateField: "published",
      groupBy: "week",
      after: "2026-08-13",
      before: "2026-08-13",
    })
    expect(week.groups.map((group) => group.key)).toEqual(["2026-08-10"])
    expect(week.total).toBe(2)
  })

  it("can use first-seen dates when auditing capture history", async () => {
    const vault = await fixture()

    const result = vault.timeline({ dateField: "first_seen", groupBy: "day", limit: 2 })

    expect(result.groups[0]?.key).toBe("2026-08-17")
    expect(result.total).toBe(2)
  })

  it("rejects an inverted date range", async () => {
    const vault = await fixture()

    expect(() => vault.timeline({ after: "2026-08-14", before: "2026-08-13" })).toThrow(
      "earlier than or equal",
    )
  })
})
