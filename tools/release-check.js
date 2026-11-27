// This script is inlined in the production entry so the check can run during loading.
(() => {
  const currentRelease = document.currentScript.dataset.release;
  const updateParam = '_frost_update';
  const entry = new URL(location.href);
  const updateNavigation = entry.searchParams.has(updateParam);
  entry.searchParams.delete(updateParam);

  let started = false;
  let checking = false;
  let navigating = false;

  document.addEventListener('click', event => {
    if (!event.target.closest?.('#start')) return;
    if (navigating) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    started = true;
  }, true);

  async function checkRelease() {
    if (started || checking || navigating) return;
    checking = true;

    const probe = new URL(entry);
    probe.hash = '';
    const nonce = crypto.getRandomValues(new Uint32Array(2)).join('-');
    probe.searchParams.set(updateParam, nonce);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(probe, { cache: 'no-store', signal: controller.signal });
      if (!response.ok) return;
      const html = await response.text();
      const release = html.match(/<script data-release="([a-f0-9]{12})">/)?.[1];
      if (!release || release === currentRelease || started) return;

      // Use the URL that served the newer HTML and keep the presentation's history intact.
      probe.hash = entry.hash;
      navigating = true;
      location.replace(probe);
    } catch {
      // A failed check leaves the game playable.
      navigating = false;
    } finally {
      clearTimeout(timeout);
      checking = false;
    }
  }

  if (updateNavigation) {
    // Skip the check on this navigation to prevent reload loops during an edge rollout.
    try { history.replaceState(history.state, '', entry); } catch {}
  } else {
    void checkRelease();
  }

  addEventListener('pageshow', event => {
    if (event.persisted) void checkRelease();
  });
})();
