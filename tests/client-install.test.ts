import { spawnSync } from "node:child_process"
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
      args: [
        "/d",
        "/v:on",
        "/s",
        "/c",
        '"codex" "!FEEDRECALL_CLIENT_ARG_0!" "!FEEDRECALL_CLIENT_ARG_1!" "!FEEDRECALL_CLIENT_ARG_2!"',
      ],
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

  it
    .skipIf(process.platform !== "win32")
    .each(["SAFE&whoami", "SAFE|whoami", "SAFE%PATH%", "SAFE^whoami", "SAFE(parent)"])(
    "keeps shell metacharacters inside a Windows argument: %s",
    (value) => {
      // Given: an argument that would become a second command when unquoted.
      const command = clientCommand(
        process.execPath,
        ["-e", "process.stdout.write(process.argv[1])", value],
        "win32",
        "C:\\Windows\\System32\\cmd.exe",
      )

      // When: the prepared command is executed through the Windows shim.
      const result = spawnSync(command.executable, command.args, {
        encoding: "utf8",
        env: {
          ...process.env,
          FEEDRECALL_CLIENT_ARG_0: "-e",
          FEEDRECALL_CLIENT_ARG_1: "process.stdout.write(process.argv[1])",
          FEEDRECALL_CLIENT_ARG_2: value,
        },
        windowsVerbatimArguments: true,
      })

      // Then: the metacharacter remains data and cannot start another command.
      expect(result.error).toBeUndefined()
      expect(result.status).toBe(0)
      expect(result.stdout).toBe(value)
    },
  )
})
