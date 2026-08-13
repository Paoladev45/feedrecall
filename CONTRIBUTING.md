# Contributing to FeedRecall

Thanks for helping turn saved discoveries into durable agent memory.

## Development

Requirements: Node.js 22.5 or newer.

```bash
npm ci
npm run check
```

Use synthetic examples and temporary vault directories in tests. Never commit a real FeedRecall
database, browser export, social profile identifier, cookie, token, or private project memory.

## Pull requests

Keep each change focused. Explain the user-visible behavior, add tests for changed boundaries, and
run `npm run check`. Connector changes must document what data is read, where it is stored, and which
external actions remain user-controlled.

By contributing, you agree that your contributions are licensed under Apache-2.0.
