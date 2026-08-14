# FeedRecall Growth Agent

FeedRecall includes a small, safe growth loop for open-source maintenance. It turns meaningful local Git changes into a campaign draft that a maintainer can review, publish, and measure.

The first version is deliberately `draft-first`:

```text
Git change -> promotion signal -> evidence-backed draft -> human review -> publication -> manual metrics
```

The tool never stars repositories, creates accounts, follows users, sends bulk replies or DMs, or publishes to a social account. A scheduled run creates an artifact only.

## Local usage

Build the CLI, then inspect the latest changes:

```bash
npm run build:core
node dist/cli.js growth draft \
  --repo . \
  --repository FeedRecall \
  --repo-url https://github.com/Paoladev45/feedrecall \
  --release v0.2.0 \
  --channel x \
  --output .growth/growth-plan.json
```

The JSON plan includes:

- the selected commit and changed files;
- a machine-readable signal: `feature`, `bugfix`, or `documentation`;
- a short draft for the selected channel;
- source claims that keep the draft tied to the repository and commit;
- `requiresHumanApproval: true` and an empty external side-effect list.

Dependency-only, formatting-only, or empty changes produce a `quiet` plan. This prevents the account from publishing content for every maintenance commit.

## Measuring a campaign

Use manually recorded, aggregate metrics. The example is synthetic:

```bash
node dist/cli.js growth measure examples/growth-metrics.json
```

The measurement distinguishes:

- `adoption`: external users, issues, or contributors exist;
- `interest`: stars or downloads exist without a stronger adoption signal;
- `iterate`: no measurable response yet.

Stars are useful context, but external usage is the stronger product signal. Rates are `null` when no visits were recorded, so the tool never invents a conversion rate.

## Scheduled workflow

`.github/workflows/growth-draft.yml` runs once per week and can also be started manually. It has `contents: read` permission, builds the CLI, and uploads one short-lived draft artifact. It does not push commits, open issues, publish posts, or access private account data.

The workflow is an autonomous review assistant, not a social bot. A maintainer must inspect the artifact and choose whether a real release or public post is appropriate.

## Operating policy

Allowed without a network side effect:

- inspect the public repository history;
- identify changes that are meaningful to users;
- draft release notes, tutorials, and one-off launch copy;
- calculate metrics supplied by the maintainer;
- suggest a product or documentation opportunity.

Human approval remains required for:

- posting on X or another account;
- opening or merging a pull request in another repository;
- creating releases, deploying, or changing account settings;
- submitting a project to a community directory.

Never automate stars, star-for-star exchanges, fake accounts, fake testimonials, mass mentions, mass comments, mass follows, or unsolicited DMs. The goal is real users who find the project useful, not a manipulated ranking.

## Next phases

The safe extension path is:

1. add explicit release and issue evidence sources;
2. store campaign drafts and measurements in the local FeedRecall vault;
3. add a human approval queue in the cockpit;
4. prepare relevant, reviewable contributions to compatible community lists;
5. add authenticated publication only behind an explicit approval step.
