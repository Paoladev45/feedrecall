import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import path from "node:path"

const cliPath = path.resolve("dist", "cli.js")
if (!existsSync(cliPath)) {
  const tsupCliPath = path.resolve("node_modules", "tsup", "dist", "cli-default.js")
  const result = spawnSync(process.execPath, [tsupCliPath], {
    stdio: "inherit",
    windowsHide: true,
  })
  if (result.error) throw result.error
  if (result.status !== 0) process.exitCode = result.status ?? 1
}
