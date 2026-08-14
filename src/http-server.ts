import { serve } from "@hono/node-server"
import { serveStatic } from "@hono/node-server/serve-static"
import { Hono } from "hono"
import { z } from "zod"
import { ObsolescenceInputSchema } from "./obsolescence.js"
import { dataDirectory } from "./paths.js"
import type { Vault } from "./storage/vault.js"
import { TimelineInputSchema } from "./timeline.js"

export function startHttpServer(vault: Vault, port: number, webRoot: string): void {
  const app = new Hono()
  app.get("/api/stats", (context) => context.json(vault.stats()))
  app.get("/api/projects", (context) => context.json(vault.projects()))
  app.get("/api/timeline", (context) => {
    const input = TimelineInputSchema.parse({
      dateField: context.req.query("date_field"),
      groupBy: context.req.query("group_by"),
      project: context.req.query("project"),
      after: context.req.query("after"),
      before: context.req.query("before"),
      limit: context.req.query("limit"),
    })
    return context.json(
      vault.timeline({
        dateField: input.dateField,
        groupBy: input.groupBy,
        ...(input.project ? { project: input.project } : {}),
        ...(input.after ? { after: input.after } : {}),
        ...(input.before ? { before: input.before } : {}),
        limit: input.limit,
      }),
    )
  })
  app.get("/api/obsolescence", (context) => {
    const input = ObsolescenceInputSchema.parse({
      asOf: context.req.query("as_of"),
      limit: context.req.query("limit"),
    })
    return context.json(
      vault.obsolescence({
        ...(input.asOf ? { asOf: input.asOf } : {}),
        limit: input.limit,
      }),
    )
  })
  app.get("/api/memories", (context) => {
    const input = z
      .object({
        q: z.string().default(""),
        project: z.string().optional(),
        evidence: z.string().optional(),
      })
      .parse({
        q: context.req.query("q") ?? "",
        project: context.req.query("project"),
        evidence: context.req.query("evidence"),
      })
    return context.json(
      vault.search({
        query: input.q,
        ...(input.project ? { project: input.project } : {}),
        ...(input.evidence ? { evidence: input.evidence } : {}),
        limit: 500,
      }),
    )
  })
  app.get("/api/memories/:id", (context) => {
    const id = decodeURIComponent(context.req.param("id"))
    const memory = vault.get(id)
    return memory
      ? context.json({ memory, events: vault.events(id) })
      : context.json({ error: "not found" }, 404)
  })
  app.post("/api/memories/:id/refresh-relevance", (context) =>
    context.json(vault.refreshRelevance(decodeURIComponent(context.req.param("id")))),
  )
  app.use(
    "/*",
    serveStatic({
      root: webRoot,
      rewriteRequestPath: (requestPath) => (requestPath === "/" ? "/index.html" : requestPath),
    }),
  )
  serve({ fetch: app.fetch, port, hostname: "127.0.0.1" })
  console.log(`FeedRecall cockpit: http://127.0.0.1:${port}`)
  console.log(`Data stays local in ${dataDirectory()}`)
}
