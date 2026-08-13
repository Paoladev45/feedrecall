import path from "node:path"
import { describe, expect, it } from "vitest"
import { dataDirectory } from "../src/paths.js"

describe("shared data directory", () => {
  it("uses the user home so every local agent opens the same vault", () => {
    expect(dataDirectory("C:\\Users\\Example", undefined)).toBe(
      path.join("C:\\Users\\Example", ".feedrecall"),
    )
  })

  it("honors an explicit FeedRecall home override", () => {
    expect(dataDirectory("C:\\Users\\Example", "D:\\private-vault")).toBe("D:\\private-vault")
  })
})
