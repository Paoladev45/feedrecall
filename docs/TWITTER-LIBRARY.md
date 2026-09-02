# Import a local X library

FeedRecall can import a `library.json` v2 snapshot produced by the local X library
workflow. The importer reads the file only; it does not call the X API, open a
browser, or accept cookies and tokens.

```bash
pnpm run build
pnpm feedrecall import-twitter-library "C:/path/to/library.json"
```

The import preserves:

- the X post URL, author, text, summary, publication date, and capture history;
- image, GIF, and video source URLs as media resources;
- external links such as GitHub repositories and documentation;
- categories, tags, clusters, priorities, and `project:<slug>` topics.

The adapter treats a saved post as `observed`, not verified. A triaged source
record starts in `reviewed` processing state, while a blank `captured_at` falls
back to the snapshot `built_at`. Re-importing the same snapshot is idempotent:
the source ID prevents duplicates, `firstSeenAt` remains stable, and
`lastSeenAt` advances when the snapshot is newer. Duplicate source IDs inside a
single snapshot are imported once.

The file boundary is strict. Unknown top-level or record fields are rejected,
which prevents cookies, sessions, and other credentials from entering the
vault. Imported relevance is refreshed for every memory, including vaults with
more than 500 records.
