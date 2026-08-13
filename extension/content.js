function captureVisiblePosts() {
  const articles = [...document.querySelectorAll('article[data-testid="tweet"]')]
  const records = []
  const seen = new Set()
  for (const article of articles) {
    const statusLinks = [...article.querySelectorAll('a[href*="/status/"]')]
    const link = statusLinks.map((node) => node.href).find((href) => /\/status\/\d+/.test(href))
    const id = link?.match(/\/status\/(\d+)/)?.[1]
    if (!link || !id || seen.has(id)) continue
    seen.add(id)
    const textNode = article.querySelector('[data-testid="tweetText"]')
    const time = article.querySelector("time")
    const authorLink = article.querySelector('a[role="link"][href^="/"]')
    const media = [...article.querySelectorAll("img[src], video source[src]")]
      .map((node) => node.src)
      .filter((value) => value && !value.includes("profile_images"))
    const externalLinks = [...article.querySelectorAll("a[href]")]
      .map((node) => node.href)
      .filter(
        (value) =>
          value &&
          /^https?:\/\//.test(value) &&
          !/https:\/\/(x|twitter)\.com\//.test(value) &&
          !value.startsWith("https://t.co/"),
      )
    records.push({
      id,
      url: link.split("?")[0],
      author: authorLink?.textContent?.trim() || "Unknown author",
      published_at: time?.dateTime || null,
      text: textNode?.textContent?.trim() || "",
      media: [...new Set(media)],
      external_links: [...new Set(externalLinks)],
    })
  }
  return records
}

globalThis.FeedRecallCapture = { captureVisiblePosts }
