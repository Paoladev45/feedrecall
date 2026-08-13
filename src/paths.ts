import os from "node:os"
import path from "node:path"

export function dataDirectory(
  home = os.homedir(),
  override = process.env["FEEDRECALL_HOME"],
): string {
  return override ?? path.join(home, ".feedrecall")
}

export function databasePath(): string {
  return path.join(dataDirectory(), "feedrecall.db")
}
