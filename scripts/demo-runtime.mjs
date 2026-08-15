import { spawnSync } from "node:child_process"

export async function waitForHttp(url, timeoutMs = 5_000) {
  const expectedUrl = new URL(url)
  if (expectedUrl.protocol !== "http:" || expectedUrl.hostname !== "127.0.0.1") {
    throw new Error(`Demo readiness URL must target http://127.0.0.1: ${url}`)
  }
  const deadline = Date.now() + timeoutMs
  let lastError

  while (Date.now() < deadline) {
    try {
      const response = await fetch(expectedUrl, { redirect: "error" })
      if (response.url !== expectedUrl.href) {
        lastError = new Error(`Unexpected readiness URL ${response.url}`)
      } else if (response.ok) {
        return
      } else {
        lastError = new Error(`HTTP ${response.status}`)
      }
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
