import { execFileSync, spawnSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import os from "node:os"
import path from "node:path"
import { z } from "zod"

export const clientNames = ["codex", "claude", "cursor"] as const
export type ClientName = (typeof clientNames)[number]

type ClientCommand = {
  readonly executable: string
  readonly args: readonly string[]
}

export function clientCommand(
  executable: string,
  args: readonly string[],
  platform: NodeJS.Platform,
  commandProcessor: string | undefined,
): ClientCommand {
  if (platform !== "win32") return { executable, args }
  return {
    executable: commandProcessor ?? "cmd.exe",
    args: ["/d", "/s", "/c", executable, ...args],
  }
}

function runClient(executable: string, args: readonly string[], ignoreFailure = false): void {
  const command = clientCommand(executable, args, process.platform, process.env["ComSpec"])
  if (ignoreFailure) {
    spawnSync(command.executable, command.args, { stdio: "ignore" })
    return
  }
  execFileSync(command.executable, command.args, { stdio: "inherit" })
}

export function installClient(client: ClientName, executable: string, home: string): string {
  const command = process.execPath
  const args = [executable, "mcp"]
  if (client === "codex") {
    runClient("codex", ["mcp", "remove", "feedrecall"], true)
    runClient("codex", ["mcp", "add", "feedrecall", "--", command, ...args])
    return "Codex, ChatGPT desktop, and the Codex IDE extension now share FeedRecall."
  }
  if (client === "claude") {
    runClient("claude", ["mcp", "remove", "feedrecall", "--scope", "user"], true)
    runClient("claude", ["mcp", "add", "--scope", "user", "feedrecall", "--", command, ...args])
    return "Claude Code now has FeedRecall as a user-scoped MCP server."
  }
  const cursorDirectory = path.join(home, ".cursor")
  const configPath = path.join(cursorDirectory, "mcp.json")
  mkdirSync(cursorDirectory, { recursive: true })
  const ConfigSchema = z
    .object({ mcpServers: z.record(z.string(), z.unknown()) })
    .catch({ mcpServers: {} })
  const current = ConfigSchema.parse(
    existsSync(configPath) ? JSON.parse(readFileSync(configPath, "utf8")) : {},
  )
  current.mcpServers["feedrecall"] = { command, args }
  writeFileSync(configPath, `${JSON.stringify(current, null, 2)}\n`, "utf8")
  return `Cursor MCP configuration updated at ${configPath.replace(os.homedir(), "~")}.`
}
