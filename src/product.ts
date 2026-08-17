import { z } from "zod"
import packageMetadata from "../package.json" with { type: "json" }
import type { McpLaunch } from "./client-install.js"

const metadata = z.object({ version: z.string().regex(/^\d+\.\d+\.\d+$/) }).parse(packageMetadata)

export const packageVersion = metadata.version
export const latestPackageUrl =
  "https://github.com/Paoladev45/feedrecall/releases/latest/download/feedrecall.tgz"
export const releasePackageUrl = `https://github.com/Paoladev45/feedrecall/releases/download/v${packageVersion}/feedrecall.tgz`

export function packageMcpLaunch(
  packageSpecifier: string,
  platform: NodeJS.Platform = process.platform,
  commandProcessor: string | undefined = process.env["ComSpec"],
): McpLaunch {
  if (platform === "win32") {
    const safeSpecifier = z
      .string()
      .min(1)
      .regex(/^[^\r\n"&|<>^%!]+$/)
      .parse(packageSpecifier)
    return {
      executable: commandProcessor ?? "cmd.exe",
      args: ["/d", "/s", "/c", `pnpm --config.ignore-scripts=true dlx "${safeSpecifier}" mcp`],
    }
  }
  return {
    executable: "pnpm",
    args: ["--config.ignore-scripts=true", "dlx", packageSpecifier, "mcp"],
  }
}
