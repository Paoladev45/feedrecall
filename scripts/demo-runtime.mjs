import { spawnSync } from "node:child_process"

export async function waitForHttp(url, timeoutMs = 5_000) {
  const deadline = Date.now() + timeoutMs
  let lastError

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url)
      if (response.ok) return
      lastError = new Error(`HTTP ${response.status}`)
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
    }
    await new Promise((resolve) => setTimeout(resolve, 25))
  }

  throw new Error(`Demo server did not become ready at ${url}`, { cause: lastError })
}

export function terminateChild(child) {
  if (child.exitCode !== null || child.killed) return
  if (process.platform === "win32" && child.pid) {
    spawnSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
      stdio: "ignore",
    })
    return
  }
  child.kill("SIGTERM")
}
