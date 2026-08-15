import { spawn, spawnSync } from "node:child_process"
import { mkdtempSync, rmSync } from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { findAvailablePort } from "./demo-port.mjs"
import { terminateChild, waitForHttp } from "./demo-runtime.mjs"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const cliPath = path.join(root, "dist", "cli.js")
const demoHome = mkdtempSync(path.join(os.tmpdir(), "feedrecall-demo-"))
const cleanupWatchdog = spawn(
  process.execPath,
  [path.join(root, "scripts", "demo-cleanup.mjs"), demoHome, String(process.pid)],
  { detached: true, stdio: "ignore" },
)
cleanupWatchdog.unref()
const environment = { ...process.env, FEEDRECALL_HOME: demoHome }
let server
let cleaned = false
let shuttingDown = false

function runCli(args) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: root,
    env: environment,
    stdio: "inherit",
  })
  if (result.error) throw result.error
  if (result.status !== 0)
    throw new Error(`FeedRecall command failed with status ${result.status ?? "unknown"}`)
}

function cleanupDemo() {
  if (cleaned) return
  try {
    rmSync(demoHome, { recursive: true, force: true })
    cleaned = true
  } catch (error) {
    if (process.platform !== "win32") throw error
    setTimeout(cleanupDemo, 50)
  }
}

function stopServer() {
  if (server) {
    terminateChild(server)
    return
  }
  cleanupDemo()
}

function fail(error) {
  if (shuttingDown) return
  shuttingDown = true
  console.error(error instanceof Error ? error.message : String(error))
  stopServer()
  cleanupDemo()
  process.exitCode = 1
}

function handleSignal(code) {
  if (shuttingDown) return
  shuttingDown = true
  process.exitCode = code
  stopServer()
  cleanupDemo()
}

process.once("SIGINT", () => handleSignal(130))
process.once("SIGTERM", () => handleSignal(143))
process.once("SIGBREAK", () => handleSignal(130))
process.once("exit", cleanupDemo)

try {
  runCli(["init"])
  runCli(["import", path.join(root, "examples", "discoveries.json")])
  runCli(["import-projects", path.join(root, "examples", "projects.json")])

  const requestedPort = Number(process.env["FEEDRECALL_DEMO_PORT"] ?? "4173")
  const port = await findAvailablePort(requestedPort)
  if (port !== requestedPort) {
    console.log(`Port ${requestedPort} is busy; using ${port} for this demo.`)
  }

  server = spawn(process.execPath, [cliPath, "serve", "--port", String(port)], {
    cwd: root,
    env: environment,
    stdio: "inherit",
  })
  server.once("error", fail)
  server.once("exit", (code) => {
    cleanupDemo()
    if (process.exitCode === undefined) process.exitCode = code ?? 0
  })

  const url = `http://127.0.0.1:${port}/`
  await waitForHttp(url)
  console.log(`FeedRecall demo vault: ${demoHome}`)
  console.log(`Open ${url} to inspect the synthetic cockpit.`)
} catch (error) {
  fail(error)
}
