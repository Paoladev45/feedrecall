import { spawnSync } from "node:child_process"
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { clientCommand, installClient } from "../src/client-install.js"
import { packageMcpLaunch, releasePackageUrl } from "../src/product.js"

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
        '""codex" "!FEEDRECALL_CLIENT_ARG_0!" "!FEEDRECALL_CLIENT_ARG_1!" "!FEEDRECALL_CLIENT_ARG_2!""',
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

  it("builds a version-pinned public MCP launcher", () => {
    expect(packageMcpLaunch(releasePackageUrl, "linux", undefined)).toEqual({
      executable: "pnpm",
      args: ["--config.ignore-scripts=true", "dlx", releasePackageUrl, "mcp"],
    })
  })

  it("routes the public launcher through cmd on Windows", () => {
    expect(packageMcpLaunch(releasePackageUrl, "win32", "C:\\Windows\\System32\\cmd.exe")).toEqual({
      executable: "C:\\Windows\\System32\\cmd.exe",
      args: ["/d", "/s", "/c", `pnpm --config.ignore-scripts=true dlx "${releasePackageUrl}" mcp`],
    })
  })

  it("preserves unrelated Cursor settings while installing FeedRecall", async () => {
    const home = await mkdtemp(path.join(tmpdir(), "feedrecall-cursor-"))
    const cursorDirectory = path.join(home, ".cursor")
    await mkdir(cursorDirectory)
    const configPath = path.join(cursorDirectory, "mcp.json")
    await writeFile(
      configPath,
      `${JSON.stringify({ theme: "dark", mcpServers: { existing: { command: "existing" } } })}\n`,
      "utf8",
    )

    installClient("cursor", { executable: "pnpm", args: ["dlx", "feedrecall.tgz", "mcp"] }, home)

    expect(JSON.parse(await readFile(configPath, "utf8"))).toEqual({
      theme: "dark",
      mcpServers: {
        existing: { command: "existing" },
        feedrecall: {
          command: "pnpm",
          args: ["dlx", "feedrecall.tgz", "mcp"],
        },
      },
    })
  })

  it.skipIf(process.platform !== "win32")("executes a no-space Windows executable", () => {
    // Given: a system executable whose path does not contain spaces.
    const executable = path.join(
      process.env["SystemRoot"] ?? "C:\\Windows",
      "System32",
      "where.exe",
    )
    const commandProcessor = process.env["ComSpec"] ?? "C:\\Windows\\System32\\cmd.exe"
    const command = clientCommand(executable, ["cmd.exe"], "win32", commandProcessor)

    // When: the prepared command is executed through cmd.exe.
    const result = spawnSync(command.executable, command.args, {
      encoding: "utf8",
      env: {
        ...process.env,
        FEEDRECALL_CLIENT_ARG_0: "cmd.exe",
      },
      windowsVerbatimArguments: true,
    })

    // Then: the no-space executable receives its argument intact.
    expect(result.error).toBeUndefined()
    expect(result.status).toBe(0)
    expect(result.stdout).toContain("cmd.exe")
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
