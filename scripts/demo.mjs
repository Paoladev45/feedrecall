import { spawn, spawnSync } from "node:child_process"
import { mkdtempSync, rmSync } from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { findAvailablePort } from "./demo-port.mjs"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const cliPath = path.join(root, "dist", "cli.js")
const demoHome = mkdtempSync(path.join(os.tmpdir(), "feedrecall-demo-"))
const environment = { ...process.env, FEEDRECALL_HOME: demoHome }

function runCli(args) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: root,
    env: environment,
    stdio: "inherit",
  })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}

runCli(["init"])
runCli(["import", path.join(root, "examples", "discoveries.json")])
runCli(["import-projects", path.join(root, "examples", "projects.json")])

const requestedPort = Number(process.env["FEEDRECALL_DEMO_PORT"] ?? "4173")
const port = await findAvailablePort(requestedPort)
if (port !== requestedPort) {
  console.log(`Port ${requestedPort} is busy; using ${port} for this demo.`)
}

console.log(`FeedRecall demo vault: ${demoHome}`)
console.log(`Open http://127.0.0.1:${port}/ to inspect the synthetic cockpit.`)

const server = spawn(process.execPath, [cliPath, "serve", "--port", String(port)], {
  cwd: root,
  env: environment,
  stdio: "inherit",
})

function stopServer() {
  if (!server.killed) server.kill()
}

function cleanupDemo() {
  rmSync(demoHome, { recursive: true, force: true })
}

process.on("SIGINT", stopServer)
process.on("SIGTERM", stopServer)
server.on("exit", (code) => {
  cleanupDemo()
  process.exitCode = code ?? 0
})
