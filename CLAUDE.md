# DashyNMS website

Static HTML, CSS and browser JavaScript for dashynms.pckp.net. Pages publish
from the root of `main`. Keep the app-facing URLs in the developer guide stable.

## Repository conventions

- Before changing build, test or publication workflows, read [the developer guide](docs/DEVELOPMENT.md). Before changing release notes, read its [Release notes](docs/DEVELOPMENT.md#release-notes) section.
- Before changing shared conventions or security checks, read [Repository standards](docs/REPOSITORY-STANDARDS.md); update the canonical source and every affected consumer.
- Create or find an issue describing the bug or intended change before opening any PR, including dependency, documentation and CI changes. Every PR must reference its issue.
- Work on a branch; use one issue per PR into `main`, then squash-merge. The PR title becomes the commit subject on `main`.
- PR titles, branch commits and issue titles use `type(scope): what changes, as the user would notice it`. Read [Commits, pull requests and issues](docs/DEVELOPMENT.md#commits-pull-requests-and-issues) for this repository's types, scopes and examples.
- Start the description in lower case, omit the final full stop and aim for a complete subject under 72 characters. Separate two scopes with a comma; omit the scope when there is no single area. Document a new scope in the developer guide in the same PR.
- Word issue titles as the result the fixing PR delivers. Epics end with `(epic)`. Keep issue numbers out of titles; start the PR body with `Closes #NN` when resolving an issue, then explain what changes and how it was checked.
- Mark breaking changes with `!` and explain the migration and version implications for affected consumers.
- Dependabot uses `build(deps): ...` for every ecosystem. Its generated dependency names and grouped summaries may exceed the usual title length.
- Use British spelling in user-facing text. Keep real device names, hostnames, addresses, credentials and other identifiable network data out of issues, PRs, commits, logs, screenshots and fixtures. Use `example.net` and documentation address ranges.
- Commits, PRs and release notes carry no AI attribution or `Co-Authored-By` lines.
- Read `LICENSE` before changing or redistributing repository material. Preserve third-party licences, copyright notices and provenance.

## Validation and releases

- Before changing CI or publication, read [Publishing](docs/DEVELOPMENT.md#publishing) and [Repository standards](docs/REPOSITORY-STANDARDS.md).
- Before changing release rendering, read [Release notes](docs/DEVELOPMENT.md#release-notes). Fetch notes from the public GitHub API and render only permitted markup.
- Use the [local checks](docs/REPOSITORY-STANDARDS.md#local-checks) and check changed browser scripts with `node --check`. The website has no application package or release workflow.
