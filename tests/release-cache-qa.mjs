import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { setTimeout as delay } from 'node:timers/promises';

const docs = new URL('../docs/', import.meta.url);
const currentHtml = await readFile(new URL('index.html', docs), 'utf8');
const marker = /<script data-release="([a-f0-9]{12})">/;
const currentRelease = currentHtml.match(marker)[1];
const oldRelease = '000000000000';
const oldHtml = currentHtml.replace(marker, '<script data-release="000000000000">');
let published = oldHtml;
let pendingProbe;
let holdProbe = false;
let canonicalRequests = 0;
let updateNavigations = 0;
let assetRequests = 0;

const game = createServer(async (request, response) => {
  const url = new URL(request.url, 'http://localhost');
  if (url.pathname === '/game/') {
    const bypass = url.searchParams.has('_frost_update');
    const probe = request.headers['sec-fetch-dest'] === 'empty';
    if (!bypass) canonicalRequests++;
    if (bypass && !probe) updateNavigations++;
    const send = () => {
      response.writeHead(200, {
        'Content-Type': 'text/html',
        'Cache-Control': 'public, max-age=600',
      });
      response.end(published);
    };
    if (probe && holdProbe) pendingProbe = send;
    else send();
    return;
  }
  const asset = url.pathname.match(/^\/game\/(assets\/[\w.-]+)$/)?.[1];
  if (!asset) return response.writeHead(404).end();
  assetRequests++;
  const types = { js: 'text/javascript', css: 'text/css', webp: 'image/webp', wav: 'audio/wav' };
  response.writeHead(200, {
    'Content-Type': types[asset.split('.').at(-1)],
    'Cache-Control': 'public, max-age=600',
  });
  response.end(await readFile(new URL(asset, docs)));
});

async function listen(server) {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return 'http://127.0.0.1:' + server.address().port;
}

const gameOrigin = await listen(game);
const presentation = createServer((request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/html' });
  response.end(`<!doctype html><iframe src="${gameOrigin}/game/" width="640" height="360" allow="autoplay; fullscreen"></iframe>`);
});
const parentOrigin = await listen(presentation);
const debuggerUrl = process.env.CHROME_DEBUG_URL || 'http://127.0.0.1:9223';
const target = await (await fetch(debuggerUrl + '/json/new?about:blank', { method: 'PUT' })).json();
const socket = new WebSocket(target.webSocketDebuggerUrl);
await once(socket, 'open');
let id = 0;
const calls = new Map();
socket.onmessage = ({ data }) => {
  const message = JSON.parse(data);
  const call = calls.get(message.id);
  if (!call) return;
  calls.delete(message.id);
  if (message.error) call.reject(new Error(message.error.message));
  else call.resolve(message.result);
};

function cdp(method, params = {}) {
  return new Promise((resolve, reject) => {
    calls.set(++id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression, child = true) {
  const params = { expression, returnByValue: true };
  if (child) {
    const { frameTree } = await cdp('Page.getFrameTree');
    const frame = frameTree.childFrames?.[0]?.frame;
    if (!frame?.url.startsWith(gameOrigin)) return;
    const { executionContextId } = await cdp('Page.createIsolatedWorld', { frameId: frame.id });
    params.contextId = executionContextId;
  }
  const { result, exceptionDetails } = await cdp('Runtime.evaluate', params);
  if (exceptionDetails) throw new Error(result.description);
  return result.value;
}

async function waitFor(condition) {
  const deadline = Date.now() + 12000;
  while (Date.now() < deadline) {
    if (await condition()) return;
    await delay(40);
  }
  assert.fail('Timed out waiting for ' + condition);
}

const release = () => evaluate('document.querySelector("[data-release]")?.dataset.release');
const ready = () => evaluate('document.getElementById("start")?.disabled === false');
const open = number => cdp('Page.navigate', { url: parentOrigin + '/presentation/' + number });

try {
  await cdp('Page.enable');
  await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await open(1);
  await waitFor(ready);
  assert.equal(await release(), oldRelease);
  assert.equal(await evaluate('document.querySelector("iframe").contentDocument === null', false), true);
  assert.equal(await evaluate('[innerWidth, innerHeight].join("x")'), '640x360');

  published = currentHtml;
  holdProbe = true;
  await open(2);
  await waitFor(() => pendingProbe);
  await waitFor(ready);
  assert.equal(await release(), oldRelease);
  assert.equal(canonicalRequests, 1, 'Reopening used fresh-but-old cached HTML');
  await evaluate('document.getElementById("start").click()');
  await waitFor(() => evaluate('document.getElementById("house")?.textContent === "House 1 of 16"'));
  await evaluate('document.getElementById("deliver").click()');
  await waitFor(() => evaluate('document.getElementById("house")?.textContent === "House 2 of 16"'));
  pendingProbe();
  pendingProbe = undefined;
  await delay(750);
  assert.equal(updateNavigations, 0, 'A late release response must not reload an active game');
  assert.equal(await evaluate('document.getElementById("house").textContent'), 'House 2 of 16');

  await open(3);
  await waitFor(() => pendingProbe);
  await waitFor(ready);
  assert.equal(await release(), oldRelease);
  assert.equal(canonicalRequests, 1);
  const requestsBeforeUpdate = assetRequests;
  pendingProbe();
  await waitFor(async () => updateNavigations === 1 && await release() === currentRelease);
  await waitFor(ready);
  assert.equal(await evaluate('location.href'), gameOrigin + '/game/');
  assert.equal(assetRequests, requestsBeforeUpdate, 'Unchanged game assets stayed in HTTP cache');
  await evaluate('location.reload()');
  await waitFor(() => canonicalRequests === 2);
  await waitFor(async () => await release() === currentRelease && await ready());
  assert.equal(updateNavigations, 1, 'Reloading a current game needs no automatic navigation');
  console.log('PASS: cross-origin 640×360 iframe reopens with warm stale HTML, updates once while idle, reuses cached assets, and preserves progress on a late check.');
} finally {
  await cdp('Page.close').catch(() => {});
  socket.close();
  presentation.closeAllConnections();
  game.closeAllConnections();
  presentation.close();
  game.close();
}
