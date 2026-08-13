let captured = []
const count = document.getElementById("count")
const status = document.getElementById("status")
const exportButton = document.getElementById("export")

document.getElementById("scan").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id || !/^https:\/\/(x|twitter)\.com\//.test(tab.url || "")) {
    status.textContent = "Open x.com or twitter.com in the active tab."
    return
  }
  await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] })
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => globalThis.FeedRecallCapture?.captureVisiblePosts() ?? [],
  })
  captured = Array.isArray(result) ? result : []
  count.textContent = String(captured.length)
  status.textContent =
    captured.length > 0
      ? "Review the count, then export a local JSON file."
      : "No rendered posts found. Scroll the page and scan again."
  exportButton.disabled = captured.length === 0
})

exportButton.addEventListener("click", async () => {
  const kind = document.getElementById("kind").value
  const envelope = {
    version: 1,
    captured_at: new Date().toISOString(),
    records: captured.map((post) => ({
      source: {
        platform: "x",
        type: kind,
        external_id: post.id,
        url: post.url,
        author: post.author,
        published_at: post.published_at,
      },
      content: {
        title: post.text.slice(0, 160) || `X post ${post.id}`,
        text: post.text,
        external_links: post.external_links,
        media: post.media,
      },
      classification: { topics: [], priority: kind === "bookmark" ? 4 : 3 },
      evidence: { status: "claimed", confidence: 0.25 },
    })),
  }
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(envelope, null, 2)], { type: "application/json" }),
  )
  await chrome.downloads.download({
    url,
    filename: `feedrecall-x-${new Date().toISOString().slice(0, 10)}.json`,
    saveAs: true,
  })
})
