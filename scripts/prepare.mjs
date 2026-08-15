import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import path from "node:path"

const cliPath = path.resolve("dist", "cli.js")
if (!existsSync(cliPath)) {
  const packageManager = process.platform === "win32" ? "pnpm.cmd" : "pnpm"
  const result = spawnSync(packageManager, ["run", "build:core"], { stdio: "inherit" })
  if (result.error) throw result.error
  if (result.status !== 0) process.exitCode = result.status ?? 1
}
