import { existsSync, rmSync } from "node:fs"
import os from "node:os"
import path from "node:path"

const [requestedTarget, requestedParentPid] = process.argv.slice(2)
const tempRoot = path.resolve(os.tmpdir())
const target = path.resolve(requestedTarget ?? "")
const parentPid = Number(requestedParentPid)
const isSafeTarget =
  path.dirname(target) === tempRoot && path.basename(target).startsWith("feedrecall-demo-")

if (!isSafeTarget || !Number.isInteger(parentPid) || parentPid <= 0) process.exit(1)

const interval = setInterval(() => {
  if (!existsSync(target)) {
    clearInterval(interval)
    process.exit(0)
  }

  try {
    process.kill(parentPid, 0)
  } catch (error) {
    if (error?.code !== "ESRCH") return
    clearInterval(interval)
    rmSync(target, { recursive: true, force: true })
    process.exit(0)
  }
}, 100)
