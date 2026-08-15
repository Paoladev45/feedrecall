# Reproducible benchmark

FeedRecall includes a small benchmark for the core local path. It generates 1,000 deterministic synthetic discoveries, imports them into a temporary SQLite vault, and measures four user-visible operations:

```bash
pnpm benchmark
```

The command reports:

- import latency;
- full-text search latency;
- project-aware recall latency;
- timeline grouping latency;
- resulting database size.

The benchmark does not make network requests and never reads the personal vault. Results are machine-specific and should be compared only with the same Node.js version, hardware, and repository revision. The command output is the authoritative result; no hand-written performance claim is embedded in the README.
