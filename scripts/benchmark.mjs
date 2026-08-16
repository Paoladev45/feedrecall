import { spawnSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs"
import os from "node:os"
import path from "node:path"
import { performance } from "node:perf_hooks"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const cliPath = path.join(root, "dist", "cli.js")
const benchmarkHome = mkdtempSync(path.join(os.tmpdir(), "feedrecall-benchmark-"))
process.once("exit", () => rmSync(benchmarkHome, { recursive: true, force: true }))
const environment = { ...process.env, FEEDRECALL_HOME: benchmarkHome }
const fixture = JSON.parse(readFileSync(path.join(root, "examples", "discoveries.json"), "utf8"))
const projectFile = path.join(root, "examples", "projects.json")
const records = Array.from({ length: 1_000 }, (_, index) => {
  const template = fixture.records[index % fixture.records.length]
  const publishedAt = new Date(Date.UTC(2026, 0, 1 + (index % 180), 12, 0, 0)).toISOString()
  return {
    ...template,
    source: {
      ...template.source,
      external_id: `benchmark-${index}`,
      url: `https://example.com/feedrecall/benchmark/${index}`,
      published_at: publishedAt,
    },
    content: {
      ...template.content,
      title: `Synthetic MCP discovery ${index}`,
      text: `Synthetic project memory record ${index} for the FeedRecall benchmark.`,
      external_links: [],
    },
    classification: {
      ...template.classification,
      priority: (index % 5) + 1,
    },
  }
})
const datasetFile = path.join(benchmarkHome, "discoveries.json")
writeFileSync(
  datasetFile,
  JSON.stringify({ version: 1, captured_at: "2026-01-01T00:00:00.000Z", records }),
  "utf8",
)

function runCli(args) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: root,
    env: environment,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  })
  if (result.error) throw result.error
  if (result.status !== 0) {
    process.stderr.write(result.stderr)
    process.exit(result.status ?? 1)
  }
  return result.stdout
}

function measure(action) {
  const started = performance.now()
  const output = action()
  return { milliseconds: Number((performance.now() - started).toFixed(2)), output }
}

runCli(["init"])
const importResult = measure(() => runCli(["import", datasetFile]))
runCli(["import-projects", projectFile])
const searchResult = measure(() => runCli(["search", "MCP memory"]))
const recallResult = measure(() =>
  runCli(["recall", "synthetic project memory", "--project", "agent-memory"]),
)
const timelineResult = measure(() =>
  runCli(["timeline", "--date-field", "published", "--group-by", "month"]),
)

console.log(
  JSON.stringify(
    {
      node: process.version,
      records: records.length,
      importMs: importResult.milliseconds,
      searchMs: searchResult.milliseconds,
      recallMs: recallResult.milliseconds,
      timelineMs: timelineResult.milliseconds,
      databaseBytes: statSync(path.join(benchmarkHome, "feedrecall.db")).size,
      dataSource: "synthetic",
      network: "not used by the benchmark",
    },
    null,
    2,
  ),
)
