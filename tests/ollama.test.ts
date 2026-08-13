import { describe, expect, it } from "vitest"
import { OllamaClient } from "../src/enrichment/ollama.js"

describe("local enrichment", () => {
  it("refuses non-local Ollama endpoints", () => {
    expect(() => new OllamaClient("https://example.com")).toThrow("local endpoint")
  })
})
