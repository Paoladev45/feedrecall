import { mkdtemp, readFile, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { importFile } from "../src/importers/json.js"
import { Vault } from "../src/storage/vault.js"

const openVaults: Vault[] = []

afterEach(() => {
  for (const vault of openVaults.splice(0)) vault.close()
})

describe("JSON import", () => {
  it("is idempotent and preserves first seen while advancing last seen", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "feedrecall-import-"))
    const databasePath = path.join(directory, "vault.db")
    const fixture = JSON.parse(await readFile(path.resolve("examples/discoveries.json"), "utf8"))
    const file = path.join(directory, "discoveries.json")
    await writeFile(file, JSON.stringify(fixture), "utf8")
    const vault = new Vault(databasePath)
    openVaults.push(vault)

    const first = await importFile(vault, file)
    fixture.captured_at = "2026-08-14T10:00:00.000Z"
    await writeFile(file, JSON.stringify(fixture), "utf8")
    const second = await importFile(vault, file)

    expect(first).toEqual({ inserted: 2, updated: 0, unchanged: 0 })
    expect(second).toEqual({ inserted: 0, updated: 2, unchanged: 0 })
    const record = vault.get("x:like:example-roblox-mcp")
    expect(record?.firstSeenAt).toBe("2026-08-13T09:30:00.000Z")
    expect(record?.lastSeenAt).toBe("2026-08-14T10:00:00.000Z")
  })

  it("rejects credentials and cookies at the import boundary", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "feedrecall-secret-"))
    const file = path.join(directory, "unsafe.json")
    await writeFile(
      file,
      JSON.stringify({
        version: 1,
        captured_at: new Date().toISOString(),
        records: [],
        cookie: "secret",
      }),
      "utf8",
    )
    const vault = new Vault(path.join(directory, "vault.db"))
    openVaults.push(vault)

    await expect(importFile(vault, file)).rejects.toThrow("Unrecognized key")
  })

  it("does not downgrade tested evidence when a source is captured again", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "feedrecall-evidence-"))
    const databasePath = path.join(directory, "vault.db")
    const fixture = JSON.parse(await readFile(path.resolve("examples/discoveries.json"), "utf8"))
    const file = path.join(directory, "discoveries.json")
    await writeFile(file, JSON.stringify(fixture), "utf8")
    const vault = new Vault(databasePath)
    openVaults.push(vault)

    await importFile(vault, file)
    const id = "x:like:example-roblox-mcp"
    vault.mark(id, {
      dimension: "evidence",
      status: "tested",
      reason: "Validated in a local integration test",
    })
    fixture.captured_at = "2026-08-15T10:00:00.000Z"
    await writeFile(file, JSON.stringify(fixture), "utf8")

    await importFile(vault, file)

    expect(vault.get(id)?.evidence.status).toBe("tested")
  })
})
