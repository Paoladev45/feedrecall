import { describe, expect, it } from "vitest"
import { clientCommand } from "../src/client-install.js"

describe("client connection command", () => {
  it("uses the Windows command processor for executable shims", () => {
    // Given: an npm-style executable shim on Windows.
    const args = ["mcp", "get", "feedrecall"]

    // When: FeedRecall prepares the external command.
    const command = clientCommand("codex", args, "win32", "C:\\Windows\\System32\\cmd.exe")

    // Then: cmd launches the shim without changing its arguments.
    expect(command).toEqual({
      executable: "C:\\Windows\\System32\\cmd.exe",
      args: ["/d", "/s", "/c", "codex", ...args],
    })
  })

  it("launches clients directly on non-Windows systems", () => {
    // Given: the same client on a POSIX system.
    const args = ["mcp", "get", "feedrecall"]

    // When: FeedRecall prepares the external command.
    const command = clientCommand("codex", args, "linux", undefined)

    // Then: no shell is inserted.
    expect(command).toEqual({ executable: "codex", args })
  })
})
