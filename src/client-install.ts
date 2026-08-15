import { spawnSync } from "node:child_process"
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

const windowsArgumentPrefix = "FEEDRECALL_CLIENT_ARG_"

export function clientCommand(
  executable: string,
  args: readonly string[],
  platform: NodeJS.Platform,
  commandProcessor: string | undefined,
): ClientCommand {
  if (platform !== "win32") return { executable, args }
  const commandParts = [
    `"${executable}"`,
    ...args.map((_, index) => `"!${windowsArgumentPrefix}${index}!"`),
  ]
  const commandLine = executable.includes(" ")
    ? `"${commandParts.join(" ")}"`
    : commandParts.join(" ")
  return {
    executable: commandProcessor ?? "cmd.exe",
    args: ["/d", "/v:on", "/s", "/c", commandLine],
  }
}

function windowsClientEnvironment(args: readonly string[]): NodeJS.ProcessEnv {
  if (args.some((argument) => argument.includes("!"))) {
    throw new Error("Windows MCP client installation does not support paths containing !")
  }
  return Object.fromEntries(
    args.map((argument, index) => [`${windowsArgumentPrefix}${index}`, argument]),
  )
}

function runClient(executable: string, args: readonly string[], ignoreFailure = false): void {
  const command = clientCommand(executable, args, process.platform, process.env["ComSpec"])
  const environment =
    process.platform === "win32"
      ? { ...process.env, ...windowsClientEnvironment(args) }
      : process.env
  const result = spawnSync(command.executable, command.args, {
    env: environment,
    stdio: ignoreFailure ? "ignore" : "inherit",
    windowsVerbatimArguments: process.platform === "win32",
  })
  if (ignoreFailure) return
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(`${command.executable} exited with status ${result.status ?? "unknown"}`)
  }
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
