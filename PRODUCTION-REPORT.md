# Production optimization and deployment preparation

Production before: **17,727,294 bytes (17.73 MB)**. Production after: **13,933,288 bytes (13.93 MB)**. Saved **3,794,006 bytes**, a **21.4% reduction**. MB uses decimal units. These figures include the complete publication folder, not only image payload.

## Size audit and conversions

| Approved asset | Previous publication bytes | Optimized bytes | Reduction |
|---|---:|---:|---:|
| 1.png | 3,004,428 | 2,429,636 | 19.1% |
| 2.png | 3,030,655 | 2,459,528 | 18.8% |
| 3.png | 3,106,403 | 2,524,590 | 18.7% |
| 4.png | 3,136,057 | 2,539,784 | 19.0% |
| ded.gif | 1,596,786 | 1,222,082 | 23.5% |
| frame.png | 2,017,192 | 1,436,638 | 28.8% |
| frame 2.png | 1,502,068 | 1,081,672 | 28.0% |
| gift 1.png | 53,277 | 37,436 | 29.7% |
| gift 2.png | 58,045 | 39,618 | 31.7% |
| gift 3.png | 57,312 | 40,158 | 29.9% |
| gift 4.png | 72,472 | 52,344 | 27.8% |
| gift 5.png | 69,536 | 50,378 | 27.6% |

The largest asset remains panorama 4: 3,136,057 → 2,539,784 bytes. The other three panoramas fall from 3.00–3.11 MB to 2.43–2.52 MB. Frames fall from 2,017,192/1,502,068 bytes to 1,436,638/1,081,672 bytes. The animated sleigh falls from 1,596,786 to 1,222,082 bytes (23.5%).

All eleven published PNGs became lossless WebP. The GIF became lossless animated WebP. Panoramas remain 2172×724; sleigh remains 797×287; frames remain 1371×1148 and 1848×851. Gifts retain their existing approved 192-pixel publication sizes; they were not reduced further. No lossy encoding or new downsampling was used. AVIF was not adopted; the verified lossless WebP result met the quality requirement.

Pillow comparisons confirm identical RGBA bytes for every static image and every composited sleigh frame, including invisible RGB values and alpha. Sleigh frame count is 20, every duration remains 100 ms, and infinite looping is unchanged. Chrome rendered screenshots also confirm animation advances. Original PNG/GIF files remain untouched as development backups.

The original development PNG/GIF files total 29,177,149 bytes; they are intentionally retained outside docs. Other excluded material includes tests, historical QA reports, build tools, ignored conversion cache, node_modules, package metadata and .DS_Store. Obsolete published PNG/GIF copies and loose unminified JS/CSS were removed. No video, audio files, external fonts or runtime libraries are deployed. The initial final release contains 12 image files, 2 scripts, 1 stylesheet, 3 HTML files and the small asset manifest.

## Code, loading and audio

- Production JavaScript/CSS is minified with pinned Terser/CleanCSS development tools. Minified game/celebration/styles are 7,855 / 4,562 / 3,874 bytes. These packages are not shipped and are not installed by Actions.
- The root remains editable, while both root and production use the same optimized image resources. Production-only dead calibration UI/code is removed. An unused delay helper was removed.
- Startup explicitly decodes only panorama 1, the sleigh, question frame and first gift. Remaining gifts/final frame preload afterward; later panoramas decode one at a time. Stops await their visible panorama sections, and gifts/final frame await their own resources before use.
- Asset promises and image references are shared in bounded maps. Transient failures get at most two retries with short backoff; persistent missing/invalid files still report an error. A cold-cache test exposed local-server connection resets, addressed with the bounded retries and a quiet HTTP/1.1 review server with a larger connection queue. This server is not deployed.
- Audio remains synthesized Web Audio: there are no audio downloads to compress. Question/delivery synthesis functions and fireworks source were compared unchanged. Approved levels, scheduling, overlap handling and final visibility pausing remain intact. Fireworks retain their bounded particle/voice limits, reusable noise buffer, disconnect-on-ended cleanup and hidden-tab pause/resume.
- CSS, extended sky, house geometry, sleigh/gift transforms, question wording/order, target map and the 75% question-panel transform are unchanged. Final fly-away still clears the entire GIF box before hiding and showing the approved final frame/fireworks. No Restart was added.

## Workflow and stable URL

Workflow: [.github/workflows/deploy.yml](.github/workflows/deploy.yml).

It uses the official GitHub Pages single-job pattern: checkout@v6, configure-pages@v5, upload-pages-artifact@v4 with `path: docs`, then deploy-pages@v4. It runs on pushes to main, grants contents:read/pages:write/id-token:write, declares the github-pages environment and serializes deployments. It has no build/dependency/Jekyll step and no custom-domain configuration. See [GitHub's official workflow guidance](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

The supplied repository is https://github.com/English-with-Svetlana/Ded-Moroz-dimohod.git. The local folder is not a Git repository and no remote was configured by this work. Expected URL based on the owner's supplied repository, after the owner's manual push and successful Actions deployment:

**https://english-with-svetlana.github.io/Ded-Moroz-dimohod/**

The URL is expected, not deployed or verified live. Keep the existing Pages source set to GitHub Actions. Include the prepared docs and release-manifest.json when performing manual Git operations. Actions/Pages and the deployment environment must permit the workflow. No PAT or custom domain is required.

Production references are relative and work under a project subpath. Hashed image/JS/CSS filenames regenerate from content. The tracked release manifest retains one prior prepared release's resources for cached HTML compatibility. No service worker or persistent application cache is introduced. HTML no-cache metadata is advisory: GitHub controls the actual Pages response headers, so this project cannot enforce custom HTML HTTP cache policy or promise instant refresh of already cached HTML. Keep the same permanent iframe URL; rebuild docs before each manual update/push.

## Focused validation performed

- Lossless RGBA/alpha, dimensions, all 20 animation frames, every duration and loop count: passed. Results: tests/optimization-pixels.json.
- Syntax checks, all hashed resources, HTML references and relative publication paths: passed. No missing or absolute-localhost production references, symlinks or undeployed runtime dependencies.
- Workflow YAML parsed with PyYAML and checked for trigger, official actions, permissions, concurrency and docs artifact path: passed. The workflow was not executed against GitHub.
- Existing fast simulated gameplay tests passed for root and minified production, including all questions/gifts/targets, click lock, final terminal state and no Restart. The mock was updated for the approved full-GIF departure bounds and hashed script path.
- Focused Chrome tests passed for root and production at 1920×1080: Start, first question, one early delivery, moving animated WebP, the final stop/departure, exact final phrases and synchronized fireworks. The full group box was beyond the stage before hiding. Explicit panorama decode concurrency was 1. Final cold-cache run had zero network failures and no captured JavaScript exceptions or console.error calls.
- Actual 640×360 **production iframe** under `/docs/`: frame/text fit, no final controls, running audio context and matching visible/audio burst counters passed.
- Existing asset/startup regression: all 24 original and production image URLs returned HTTP 200 and decoded in Chrome. Main game, iframe preview and publication wrapper all reached the first question without a blocking error.
- No new full browser playthroughs or long soak runs were repeated: gameplay/fireworks visuals and synthesis were unchanged. Previously tested endurance bounds are retained in source; current testing is focused on conversion, loading, minification and packaging.

Current results: tests/production-results.json, tests/browser-results.json, tests/iframe-final-results.json, tests/production-size.json, tests/optimization-pixels.json. Older layout/polish/celebration reports are historical and are not presented as new tests of this release.

## Quality/compatibility limits

There is no measured pixel, alpha, resolution, timing or frame-count tradeoff. Modern WebP-capable browsers are required. Native WebP support is documented by [Google](https://developers.google.com/speed/webp) and [Apple/WebKit](https://webkit.org/blog/11340/new-webkit-features-in-safari-14/). Chrome playback was tested; Safari itself and a live Genially-hosted embed were not run. Browser/parent autoplay policy still applies. Physical loudspeaker volume was not reassessed, because the approved synthesis/levels were unchanged.

## Files changed and review links

- build.py, game.js, index.html and regenerated docs (lossless hashed images, minified hashed code/styles and HTML).
- .github/workflows/deploy.yml, .gitignore, package.json/package-lock.json and release-manifest.json.
- tools/minify.mjs and tools/serve.py.
- README.md and this report.
- Relevant QA runners/mocks and result JSON under tests.

The approved style.css and celebration.js source were not changed by this optimization. All original artwork files remain present.

Local production: http://localhost:8765/docs/

Genially-sized production iframe: http://localhost:8765/docs/iframe.html

Publication wrapper: http://localhost:8765/docs/publication.html

Editable root: http://localhost:8765/

The local server remains running. No Git repository was initialized, no remote was configured or modified, and no commit, push, deployment or publication was performed.
