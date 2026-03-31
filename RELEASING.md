# Releasing FreelanceBill

## How to Create a Release

### 1. Update the Changelog

Add a new section to `CHANGELOG.md`:

```markdown
## [1.1.0] - 2026-04-15

### Added
- New feature description

### Fixed
- Bug fix description
```

### 2. Commit the Changelog

```bash
git add CHANGELOG.md
git commit -m "chore: prepare release v1.1.0"
git push origin main
```

### 3. Create and Push a Tag

```bash
git tag v1.1.0
git push origin v1.1.0
```

That's it. GitHub Actions will automatically:
- Build the Docker images (server + web)
- Push them to `ghcr.io/milhero/freelancebill-server` and `ghcr.io/milhero/freelancebill-web`
- Create a GitHub Release with download assets

### 4. Verify

- **Actions:** [github.com/milhero/freelancebill/actions](https://github.com/milhero/freelancebill/actions) — workflow should be green
- **Release:** [github.com/milhero/freelancebill/releases](https://github.com/milhero/freelancebill/releases) — new release with `docker-compose.prod.yml` and `.env.example`
- **Packages:** [github.com/milhero?tab=packages](https://github.com/milhero?tab=packages) — both images with new version tag

## First-Time Setup: Make Packages Public

> **Important:** GitHub Container Registry defaults to private packages, even for public repos. You must do this once after the first release.

1. Go to [github.com/milhero?tab=packages](https://github.com/milhero?tab=packages)
2. Click on `freelancebill-server`
3. Click **Package settings** (right sidebar)
4. Scroll to **Danger Zone** → **Change package visibility** → Select **Public** → Confirm
5. Repeat for `freelancebill-web`

Without this step, users will get a `403` or `manifest unknown` error when pulling the images.

## Versioning

Follow [Semantic Versioning](https://semver.org/):

| Change | Version Bump | Example |
|--------|-------------|---------|
| Breaking changes (DB migration required, config changes) | MAJOR | `v1.0.0` → `v2.0.0` |
| New features (backward compatible) | MINOR | `v1.0.0` → `v1.1.0` |
| Bug fixes, patches | PATCH | `v1.0.0` → `v1.0.1` |

## Troubleshooting

### Workflow fails at "Login to GHCR"

Go to **Settings → Actions → General → Workflow permissions** and ensure **Read and write permissions** is selected.

### Users get 403 when pulling images

The packages are still private. Follow the [Make Packages Public](#first-time-setup-make-packages-public) steps above.

### Need to redo a release

```bash
# Delete the tag locally and remotely
git tag -d v1.1.0
git push origin :refs/tags/v1.1.0

# Delete the GitHub Release manually at github.com/milhero/freelancebill/releases

# Re-tag and push
git tag v1.1.0
git push origin v1.1.0
```
