# Fix unsafe pull_request_target workflow

The repository has a GitHub Actions workflow that uses `pull_request_target` while checking out untrusted pull request head code with broad permissions.

Make the workflow safe for normal pull request CI.

Rules:

- Do not use `pull_request_target` for this job.
- Do not leave `permissions: write-all`.
- Do not checkout `${{ github.event.pull_request.head.sha }}` in privileged context.
- Keep the change focused on the workflow unless absolutely necessary.
