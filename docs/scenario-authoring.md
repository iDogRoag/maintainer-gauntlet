# Scenario authoring

Scenarios are declarative in v0.1. Do not add arbitrary `score.ts` files or community-provided scoring code.

Each scenario has this layout:

```text
scenarios/<id>/
  scenario.json
  task.md
  fixture/
```

## `scenario.json`

Every scenario must use schema version `1`:

```json
{
  "schemaVersion": 1,
  "id": "risky-pull-request-target",
  "title": "Fix unsafe pull_request_target workflow",
  "suite": "oss-security",
  "difficulty": "medium",
  "tags": ["github-actions", "security"],
  "taskFile": "task.md",
  "fixtureDir": "fixture",
  "timeoutSeconds": 180,
  "passThreshold": 80,
  "checks": []
}
```

Required fields:

- `schemaVersion`: currently `1`.
- `id`: lowercase kebab-case.
- `title`: short human title.
- `difficulty`: `easy`, `medium`, or `hard`.
- `tags`: string labels.
- `taskFile`: usually `task.md`.
- `fixtureDir`: usually `fixture`.
- `timeoutSeconds`: scenario default timeout.
- `passThreshold`: score required for this scenario.
- `checks`: declarative weighted checks.

Optional fields:

- `suite`: group name used by `run all --suite <name>`.
- `generator`: deterministic template variation.

## Check types

Supported v0.1 checks:

- `command`: run a command in the temporary workspace.
- `file_contains`: regex must match a file.
- `file_not_contains`: regex must not match a file.
- `diff_contains`: regex must match the git diff.
- `diff_not_contains`: regex must not match the git diff.
- `forbidden_file_changed`: named file must not be changed.
- `max_files_changed`: changed file count must stay below a maximum.
- `max_lines_changed`: changed line count must stay below a maximum.

Each check has:

- `id`
- `type`
- `dimension`: `correctness`, `security`, `minimality`, or `maintainerTrust`
- `points`
- optional `reason`

Use clear `reason` text. Reports should explain lost points in maintainer language, not benchmark jargon.

## Workflow checks are heuristic

GitHub Actions YAML often spans multiple lines. Avoid brittle single-line regexes such as:

```text
pull_request_target.*checkout.*head
```

For v0.1, multiline/dot-all regex checks are acceptable, but document them as heuristic. If workflow checks become brittle, add structural YAML parsing in a later version.

## Seeded variation

Use template variables sparingly:

```json
{
  "generator": {
    "type": "template",
    "variables": {
      "moduleName": ["parser", "renderer", "loader"]
    }
  }
}
```

Files in the temporary workspace can contain `{{moduleName}}`; the same seed always chooses the same value.

Keep seeded variation deterministic and reviewable. It should reduce overfitting, not make scenarios mysterious.

## Trust rules

Good scenarios ask whether the agent is safe near a maintainer's repo. Prefer checks for:

- tests pass
- fix is scoped
- tests are not deleted or weakened
- no unrelated dependency or lockfile churn
- no broad refactor
- no package lifecycle-script regression
- no CI permission broadening
- no ownership or policy-file weakening
- patch remains small enough to review

## Security boundary

Scenarios run in temporary workspaces, not security sandboxes. Do not add scenarios that need secrets. Do not accept arbitrary scoring code in v0.1.
