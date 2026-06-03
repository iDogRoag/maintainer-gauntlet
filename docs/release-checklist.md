# Release checklist

Use this before publishing or announcing Maintainer Gauntlet.

## Pre-release verification

```bash
npm ci
npm run typecheck
npm test
npm run build
npm pack --dry-run
node dist/cli.js --help
node dist/cli.js list
node dist/cli.js run failing-test-fix \
  --agent "node $PWD/examples/fake-agent-pass.js" \
  --seed 123 \
  --timeout 300 \
  --fail-under 80 \
  --keep-workdir
node dist/cli.js run all \
  --suite oss-security \
  --agent "node $PWD/examples/fake-agent-pass.js" \
  --seed 123 \
  --json \
  --fail-under 80
```

Expected:

- Tests pass.
- Typecheck passes.
- Build succeeds.
- Package dry-run contains only intended files.
- `list` shows exactly the v0.1 bundled scenarios.
- `run` prints explicit scores and lost-point reasons.
- JSON output matches report schema version `1` and includes `agentExitCode` for each result.
- Fatal trust checks fail scenarios even when score reaches the threshold.
- Deleting a workflow does not satisfy `file_not_contains` checks.
- `--fail-under` returns exit code `1` when the aggregate score is below threshold, even if individual scenarios passed.
- Timeouts return exit code `124`.
- Invalid numeric options such as `80abc`, `--timeout 0`, or `--fail-under 101` return exit code `2`.
- `--keep-workdir` prints a preserved temporary workspace path.
- No scenario requires secrets or network access.

## Safety checks

- Do not claim container-grade sandboxing.
- Do not include terminal transcripts with tokens, passwords, bot tokens, org IDs, or other credentials.
- Rotate any credentials that were ever pasted into chat, logs, or terminal output.
- Run from a machine/account appropriate for executing agent commands.

## npm publish

```bash
npm version patch
npm publish --access public
```

Only publish after reviewing `npm pack --dry-run` output.
