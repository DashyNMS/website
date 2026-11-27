# Developer guide

Technical notes for the DashyNMS website. For what the site is, see the [README](../README.md).

Plain HTML and CSS with no build step, published by GitHub Pages. All pages share `assets/css/style.css`.

## Structure

```
/                    home: both apps, side by side
/desktop/            DashyNMS Desktop
/desktop/privacy/    Desktop privacy policy
/desktop/releases/   Desktop release notes
/desktop/support/    Desktop support
/mobile/             DashyNMS Mobile
/mobile/privacy/     Mobile privacy policy
/mobile/releases/    Mobile release notes
/mobile/support/     Mobile support
/mcp/                DashyNMS MCP
/mcp/privacy/        MCP privacy policy
/mcp/releases/       MCP release notes
/mcp/support/        MCP support and set-up guide
/404.html            not-found page
```

The apps link to some of these pages, so don't move them:

- `/mobile/`, `/mobile/privacy/` and `/mobile/support/` are built into the mobile app (Settings → About).
- `/desktop/` and `/desktop/privacy/` are linked from the desktop app's README and PRIVACY.md.
- `/mcp/` and `/mcp/support/` are linked from the MCP server’s README.
- `/` is the publisher link in the desktop installer.
- `/assets/img/favicon.svg` is the logo in both apps' READMEs.

## Release notes

`assets/js/releases.js` fetches release notes live from GitHub Releases: the latest release, plus the latest nightly when it's newer. Publish a release on GitHub and the site picks it up, with no change here. Drafts and edge builds (one per commit) are never shown. A prerelease from before November 2026 (`-preview.N`) is still called a preview.

The "What's new" card on each app page shows the release's opening paragraph and its first four top-level bullets that start in bold, each with the first sentence after the bold text. Write the release notes with that in mind.

## Screenshots

- **Desktop:** `assets/img/desktop/`, from the desktop repo's `docs/screenshots/`.
- **Mobile:** `assets/img/mobile/`, web-sized from the mobile repo's `docs/assets/screenshots/`.

## Local preview

Serve the folder, since pages use root-relative paths:

```
python3 -m http.server 8000
```

## Publishing

GitHub Pages publishes the root of `main` at `https://dashynms.pckp.net` after a
PR merges. Keep `CNAME` and `.nojekyll` in the root. The `github-pages` environment
allows deployments from `main`. Site files are served directly from the branch,
so keep credentials and local artefacts out of the repository.

## Commits, pull requests and issues

Open an issue before a PR. Use `type(scope): lower-case result` for PR, issue and
commit titles. Scopes include `site`, `releases`, `docs`, `licences`, `ci` and
`deps`. Use `Closes #NN` for completed work or `Refs #NN` for partial work.
Squash-merge into `main` after the required checks pass.

Run the checks in [Repository standards](REPOSITORY-STANDARDS.md). If browser
JavaScript changes, run `node --check assets/js/releases.js` and check the affected
pages in a browser. The site uses no package installation or build step.
