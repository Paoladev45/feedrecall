import type { Vault } from "../storage/vault.js"

export type CliDependencies = {
  readonly openVault: () => Vault
  readonly cliPath: string
  readonly home: string
}
