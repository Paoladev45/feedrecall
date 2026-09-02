import { readFile } from "node:fs/promises"
import { ProjectEnvelopeSchema } from "../model.js"
import type { Vault } from "../storage/vault.js"

export async function importProjects(vault: Vault, filePath: string): Promise<number> {
  const raw: unknown = JSON.parse(await readFile(filePath, "utf8"))
  const envelope = ProjectEnvelopeSchema.parse(raw)
  for (const project of envelope.projects) vault.saveProject(project)
  vault.refreshAllRelevance()
  return envelope.projects.length
}
