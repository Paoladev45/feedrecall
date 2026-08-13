import { readFile } from "node:fs/promises"
import path from "node:path"
import { JSDOM } from "jsdom"
import { describe, expect, it } from "vitest"
import { z } from "zod"

const CapturedPostSchema = z.object({
  id: z.string(),
  url: z.string(),
  author: z.string(),
  published_at: z.string().nullable(),
  text: z.string(),
  media: z.array(z.string()),
  external_links: z.array(z.string()),
})

describe("X browser capture", () => {
  it("extracts visible post data and deduplicates repeated status links", async () => {
    const dom = new JSDOM(`
      <article data-testid="tweet">
        <a role="link" href="/builder">Example Builder</a>
        <a href="https://x.com/builder/status/123"><time datetime="2026-08-13T08:00:00.000Z"></time></a>
        <div data-testid="tweetText">A useful Roblox MCP bridge</div>
        <a href="https://github.com/example/bridge">Repository</a>
        <img src="https://pbs.twimg.com/media/example.jpg" />
      </article>
      <article data-testid="tweet">
        <a href="https://x.com/builder/status/123">Duplicate render</a>
      </article>
    `)
    const source = await readFile(path.resolve("extension/content.js"), "utf8")
    const scope: Record<string, unknown> = {}
    const load = new Function(
      "document",
      "globalThis",
      `${source}; return globalThis.FeedRecallCapture`,
    )
    const captureApi = z
      .object({ captureVisiblePosts: z.function() })
      .parse(load(dom.window.document, scope))

    const posts = z.array(CapturedPostSchema).parse(captureApi.captureVisiblePosts())

    expect(posts).toHaveLength(1)
    expect(posts[0]).toMatchObject({
      id: "123",
      author: "Example Builder",
      text: "A useful Roblox MCP bridge",
      external_links: ["https://github.com/example/bridge"],
      media: ["https://pbs.twimg.com/media/example.jpg"],
    })
  })
})
