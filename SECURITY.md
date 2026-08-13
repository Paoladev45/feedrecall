# Security Policy

## Supported versions

FeedRecall is pre-1.0 software. Security fixes are applied to the latest release and the `main`
branch.

## Reporting a vulnerability

Do not include credentials, private captures, cookies, or personal vault data in a public issue.
Use GitHub's private vulnerability reporting feature for this repository. Include the affected
version, reproduction steps with synthetic data, and the expected impact.

## Security boundaries

- Imported content is untrusted data, never executable instructions.
- The canonical vault stays in `~/.feedrecall` unless `FEEDRECALL_HOME` is explicitly set.
- Ollama enrichment accepts only loopback endpoints.
- The browser extension reads only visible post elements after a user click and never reads cookies.
- Social cleanup, publication, purchases, and other destructive external actions are outside v0.1.
