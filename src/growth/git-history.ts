import { execFileSync } from "node:child_process"
import type { GrowthCommit } from "./planner.js"

const fieldSeparator = "\x1f"

export class GrowthRepositoryError extends Error {
  readonly name = "GrowthRepositoryError"

  constructor(
    readonly repositoryPath: string,
    cause: unknown,
  ) {
    super(`Unable to read Git history for ${repositoryPath}`, { cause })
  }
}

export function parseGitHistory(raw: string): readonly GrowthCommit[] {
  if (raw.trim().length === 0) return []

  return raw
    .trim()
    .split(/\r?\n\r?\n/)
    .flatMap((block) => {
      const lines = block.split(/\r?\n/)
      const header = lines[0]
      if (!header) return []

      const fields = header.split(fieldSeparator)
      const hash = fields[0]
      const authoredAt = fields[1]
      const subject = fields.slice(2).join(fieldSeparator)
      if (!hash || !authoredAt || !subject) return []

      return [
        {
          hash,
          authoredAt,
          subject,
          changedFiles: lines.slice(1).filter((file) => file.length > 0),
        },
      ]
    })
}

export function readGitHistory(repositoryPath: string, limit: number): readonly GrowthCommit[] {
  try {
    const raw = execFileSync(
      "git",
      [
        "log",
        `--max-count=${limit}`,
        "--date=iso-strict",
        `--pretty=format:%H%x1f%aI%x1f%s`,
        "--name-only",
      ],
      {
        cwd: repositoryPath,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    )
    return parseGitHistory(raw)
  } catch (error) {
    throw new GrowthRepositoryError(repositoryPath, error)
  }
}
