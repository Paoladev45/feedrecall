import type { ChildProcess } from "node:child_process"

export function waitForHttp(url: string, timeoutMs?: number): Promise<void>
export function terminateChild(child: ChildProcess): void
