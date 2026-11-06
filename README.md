# Father Frost Helps Santa

Visually approved Christmas game, prepared for GitHub Pages **via GitHub Actions**. The reduced question panel, sleigh fly-away, final copy and continuous fireworks are preserved. No deployment has been performed.

## Local review

Run `python3 tools/serve.py --port 8765` from this checkout if the review server needs restarting.

- Editable root game: http://localhost:8765/
- Optimized production: http://localhost:8765/docs/
- Production iframe preview: http://localhost:8765/docs/iframe.html
- Publication wrapper: http://localhost:8765/docs/publication.html

The server binds only to loopback and supplies appropriate local review cache headers. It is a development utility, not part of publication.

## Rebuild after edits

Local prerequisites: Python 3, macOS `sips`, Node.js/npm, and libwebp's `cwebp`/`gif2webp` CLIs.

```sh
npm ci
npm run build
```

The build preserves original PNG/GIF files, encodes lossless WebP at the existing production resolutions, and caches conversion results under ignored `.build/`. Gifts retain their previously approved 192-pixel publication size. Everything else retains native dimensions. All twenty sleigh frames, 100 ms timing, looping, RGBA pixels and visual bounds were verified unchanged.

`game.js`, `celebration.js`, `style.css` and `index.html` are editable sources. Root references the same optimized images as production. Production JS/CSS is minified with pinned build-only tools; it has no npm/CDN runtime dependencies. Calibration remains available in the development root with `?calibrate=1` and is omitted from the public build.

## Manual Git review and Actions deployment

Repository URL supplied by the owner:

https://github.com/English-with-Svetlana/Ded-Moroz-dimohod.git

This folder has no local Git repository or remote configured. Configure or use your own checkout manually. Include the source changes, `release-manifest.json`, `.github/workflows/deploy.yml` and the **complete generated docs directory** in your manual Git operations.

The prepared workflow:

1. Runs after your push to `main` (or an explicitly triggered workflow dispatch).
2. Uses checkout, configure-pages, upload-pages-artifact and deploy-pages official actions.
3. Uploads only `docs`, with no Jekyll, dependency installation or image build in Actions.
4. Uses the `github-pages` environment, Pages/OIDC permissions and serialized deployments.

Leave **Settings → Pages → Source: GitHub Actions** unchanged. Actions/Pages must be available to the repository, and any existing environment approval requirements must be satisfied. The workflow uses GitHub's built-in token; no personal access token or custom domain is needed.

Expected permanent URL, derived from the owner-supplied repository URL (not yet deployed or verified live):

https://english-with-svetlana.github.io/Ded-Moroz-dimohod/

After your successful manual push and Actions run, use that same URL for every future Genially embed. Future source changes require rebuilding and including the updated docs files before you push; Actions intentionally publishes the prepared build instead of rebuilding it.

## Genially

Paste the permanent game URL into a 16:9 embed. Example HTML if your embedding method accepts it:

```html
<iframe
  src="https://english-with-svetlana.github.io/Ded-Moroz-dimohod/"
  title="Father Frost Helps Santa"
  style="display:block;width:100%;aspect-ratio:16/9;border:0"
  allow="autoplay; fullscreen"
  allowfullscreen>
</iframe>
```

All runtime paths are relative, including inside a GitHub Pages project subpath. The game makes no localhost or external-service requests. Audio is unlocked by Start, subject to browser/parent-frame restrictions. Modern WebP-capable Chrome/Safari are required; Chrome was tested, Safari itself and a live Genially embed were not.

## Cache/version handling

Images, scripts and styles have content-hashed **filenames**. The manifest and HTML references regenerate automatically. Root development scripts retain content-version queries. There are no service workers or persistent production application caches.

`release-manifest.json` tracks the current and previous prepared release; the build retains previous-release hashed resources so cached HTML from the preceding update can still load its matching files. Keep this file with the project and let the builder prune obsolete resources. The initial optimized publication contains only current resources.

Production HTML includes advisory no-cache metadata. Actual HTTP caching on GitHub Pages is controlled by GitHub, not by files in this project; this workflow cannot force a custom Cache-Control header. Content hashing and previous-release retention prevent ordinary cross-release asset mismatch, but do not promise instant replacement of an already cached HTML document or indefinitely retain arbitrarily old releases. The permanent iframe URL never changes.

## Results and tests

[Production optimization and QA report](PRODUCTION-REPORT.md)

The final checks cover exact asset pixels/frames, workflow YAML, resource hashes/paths, simulated gameplay, and focused Chrome startup/first-delivery/final-sequence/iframe tests. Earlier files under `tests/` describe earlier designs and are historical unless referenced by the current production report. No commit, push or deployment has been run.
