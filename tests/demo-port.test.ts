import net from "node:net"
import { describe, expect, it } from "vitest"

const demoPortModule = await import(new URL("../scripts/demo-port.mjs", import.meta.url).href)

describe("demo port selection", () => {
  it("skips the occupied default demo port instead of failing", async () => {
    const occupied = net.createServer()
    await new Promise<void>((resolve, reject) => {
      occupied.once("error", reject)
      occupied.listen(0, "127.0.0.1", () => resolve())
    })

    const address = occupied.address()
    if (!address || typeof address === "string")
      throw new Error("The test server did not expose a port")

    const selected = await demoPortModule.findAvailablePort(address.port, 3)
    expect(selected).not.toBe(address.port)

    await new Promise<void>((resolve, reject) =>
      occupied.close((error) => (error ? reject(error) : resolve())),
    )
  })
})
