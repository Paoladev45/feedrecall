import net from "node:net"

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const probe = net.createServer()
    probe.once("error", () => resolve(false))
    probe.listen(port, "127.0.0.1", () => {
      probe.close(() => resolve(true))
    })
  })
}

export async function findAvailablePort(startPort, attempts = 100) {
  if (!Number.isInteger(startPort) || startPort < 1024 || startPort > 65_535) {
    throw new Error("FEEDRECALL_DEMO_PORT must be an integer between 1024 and 65535")
  }

  const lastPort = Math.min(startPort + attempts - 1, 65_535)
  for (let port = startPort; port <= lastPort; port += 1) {
    if (await isPortAvailable(port)) return port
  }

  throw new Error(`No available demo port found between ${startPort} and ${lastPort}`)
}
