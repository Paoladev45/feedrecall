import { createServer } from "node:http"
import { afterEach, describe, expect, it } from "vitest"
import { findAvailablePort } from "../scripts/demo-port.mjs"
import { waitForHttp } from "../scripts/demo-runtime.mjs"

const servers: ReturnType<typeof createServer>[] = []

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve) => {
          if (!server.listening) {
            resolve()
            return
          }
          server.close(() => resolve())
        }),
    ),
  )
})

describe("demo runtime readiness", () => {
  it("waits until the local server accepts HTTP requests", async () => {
    // Given: a server that starts after the readiness probe begins.
    const server = createServer((_request, response) => response.end("ready"))
    servers.push(server)
    const port = await findAvailablePort(49_152)
    setTimeout(() => server.listen(port, "127.0.0.1"), 25)

    // When: the demo waits for its advertised local URL.
    await waitForHttp(`http://127.0.0.1:${port}/`, 1_000)

    // Then: readiness resolves only after the server responds successfully.
    expect(server.listening).toBe(true)
  })

  it("does not follow readiness redirects", async () => {
    // Given: a local process that tries to redirect the readiness probe away.
    const server = createServer((_request, response) => {
      response.writeHead(302, { Location: "https://example.com/" })
      response.end()
    })
    servers.push(server)
    const port = await findAvailablePort(49_152)
    await new Promise<void>((resolve) => server.listen(port, "127.0.0.1", resolve))

    // When: the demo probes the local URL.
    const readiness = waitForHttp(`http://127.0.0.1:${port}/`, 100)

    // Then: the redirect cannot turn into a successful readiness result.
    await expect(readiness).rejects.toThrow("Demo server did not become ready")
  })
})
