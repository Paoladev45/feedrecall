import { mkdirSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { Command } from "commander"
import { addKnowledgeCommands } from "./cli/knowledge-commands.js"
import { addOperationalCommands } from "./cli/operational-commands.js"
import { addVaultCommands } from "./cli/vault-commands.js"
import { databasePath, dataDirectory } from "./paths.js"
import { latestPackageUrl, packageVersion } from "./product.js"
import { Vault } from "./storage/vault.js"

function openVault(): Vault {
  mkdirSync(dataDirectory(), { recursive: true })
  return new Vault(databasePath())
}

const program = new Command()
  .name("feedrecall")
  .description("Local-first, project-aware memory for AI agents")
  .version(packageVersion)

const dependencies = {
  openVault,
  cliPath: fileURLToPath(import.meta.url),
  home: process.env["USERPROFILE"] ?? process.env["HOME"] ?? ".",
}

addVaultCommands(program, dependencies)
addKnowledgeCommands(program, dependencies)
addOperationalCommands(program, dependencies)

program.addHelpText(
  "after",
  `\nPublic package: ${latestPackageUrl}\nRun 'feedrecall setup codex' for the one-command setup.\n`,
)

await program.parseAsync(process.argv)
