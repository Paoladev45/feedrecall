import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js"
import { z } from "zod"
import type { Vault } from "../storage/vault.js"

type ToolDefinition = {
  readonly name: string
  readonly description: string
  readonly annotations: ToolAnnotations
}

const readOnly = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} satisfies ToolAnnotations

const localWrite = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false,
} satisfies ToolAnnotations

const searchTool = {
  name: "memory_search",
  description: "Search saved discoveries by text, project, evidence status, and publication date.",
  annotations: readOnly,
} satisfies ToolDefinition
const getTool = {
  name: "memory_get",
  description:
    "Get one memory with provenance, project relevance, evidence, and lifecycle history.",
  annotations: readOnly,
} satisfies ToolDefinition
const recentTool = {
  name: "memory_recent",
  description: "List recently published or first-seen discoveries.",
  annotations: readOnly,
} satisfies ToolDefinition
const projectTool = {
  name: "memory_for_project",
  description: "Return the small, ranked context pack relevant to one project.",
  annotations: readOnly,
} satisfies ToolDefinition
const inboxTool = {
  name: "inbox_list",
  description: "List newly captured discoveries that still need review.",
  annotations: readOnly,
} satisfies ToolDefinition
const markTool = {
  name: "knowledge_mark",
  description: "Record a local processing, evidence, or decision transition with a reason.",
  annotations: localWrite,
} satisfies ToolDefinition

export const toolDefinitions: readonly ToolDefinition[] = [
  searchTool,
  getTool,
  recentTool,
  projectTool,
  inboxTool,
  markTool,
]

const SearchInput = z.object({
  query: z.string().default(""),
  project: z.string().optional(),
  evidence: z.enum(["claimed", "observed", "verified", "tested"]).optional(),
  published_after: z.string().optional(),
  published_before: z.string().optional(),
  limit: z.number().int().min(1).max(50).default(10),
})

const GetInput = z.object({ id: z.string().min(1) })
const ProjectInput = z.object({
  project: z.string().min(1),
  limit: z.number().int().min(1).max(50).default(15),
})
const MarkInput = z.object({
  id: z.string().min(1),
  dimension: z.enum(["processing", "evidence", "decision"]),
  status: z.string().min(1),
  reason: z.string().min(3).max(2_000),
})

export function registerTools(
  server: import("@modelcontextprotocol/sdk/server/mcp.js").McpServer,
  vault: Vault,
): void {
  server.registerTool(
    searchTool.name,
    {
      description: searchTool.description,
      inputSchema: SearchInput,
      annotations: searchTool.annotations,
    },
    (input) =>
      result(
        vault.search({
          query: input.query,
          ...(input.project ? { project: input.project } : {}),
          ...(input.evidence ? { evidence: input.evidence } : {}),
          ...(input.published_after ? { publishedAfter: input.published_after } : {}),
          ...(input.published_before ? { publishedBefore: input.published_before } : {}),
          limit: input.limit,
        }),
      ),
  )

  server.registerTool(
    getTool.name,
    {
      description: getTool.description,
      inputSchema: GetInput,
      annotations: getTool.annotations,
    },
    ({ id }) => result({ memory: vault.get(id), events: vault.events(id) }),
  )

  server.registerTool(
    recentTool.name,
    {
      description: recentTool.description,
      inputSchema: z.object({ limit: z.number().int().min(1).max(50).default(10) }),
      annotations: recentTool.annotations,
    },
    ({ limit }) => result(vault.search({ query: "", limit })),
  )

  server.registerTool(
    projectTool.name,
    {
      description: projectTool.description,
      inputSchema: ProjectInput,
      annotations: projectTool.annotations,
    },
    ({ project, limit }) => result(vault.search({ query: "", project, limit })),
  )

  server.registerTool(
    inboxTool.name,
    {
      description: inboxTool.description,
      inputSchema: z.object({ limit: z.number().int().min(1).max(50).default(20) }),
      annotations: inboxTool.annotations,
    },
    ({ limit }) =>
      result(
        vault
          .search({ query: "", limit })
          .filter((memory) => memory.processing.status === "captured"),
      ),
  )

  server.registerTool(
    markTool.name,
    {
      description: markTool.description,
      inputSchema: MarkInput,
      annotations: markTool.annotations,
    },
    (input) => {
      if (input.dimension === "processing") {
        vault.mark(input.id, {
          dimension: "processing",
          status: z.enum(["captured", "enriched", "reviewed", "archived"]).parse(input.status),
          reason: input.reason,
        })
      } else if (input.dimension === "evidence") {
        vault.mark(input.id, {
          dimension: "evidence",
          status: z.enum(["claimed", "observed", "verified", "tested"]).parse(input.status),
          reason: input.reason,
        })
      } else {
        vault.mark(input.id, {
          dimension: "decision",
          status: z.enum(["undecided", "adopted", "rejected", "replaced"]).parse(input.status),
          reason: input.reason,
        })
      }
      return result(vault.get(input.id))
    },
  )
}

function result(value: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
    structuredContent: { result: value },
  }
}
