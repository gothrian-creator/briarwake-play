// Briarwake service worker (generated at build time from public/sw-template.js).
// - Precaches the whole build so the game plays fully offline.
// - index.html / navigations: network-first (short timeout), cache fallback -> new deploys show up fast.
// - Everything else: cache-first (Vite assets are content-hashed; the precache is refreshed per build).
// - skipWaiting + clients.claim so a new build takes over without closing the installed app.
const VERSION = "899513e8e6ce";
// Scope in the name so copies hosted at different paths on one origin never evict each other.
const PREFIX = "briarwake:" + self.registration.scope + ":";
const CACHE = PREFIX + VERSION;
const PRECACHE = ["./","assets/caravan.png","assets/clearing-contested.png","assets/clearing-covenant.png","assets/clearing-league.png","assets/clearing-nightglass.png","assets/dirt.png","assets/dungeon-bg.png","assets/dungeon-gate.png","assets/index-D_VH2Ihy.js","assets/panel.png","assets/road.png","assets/sprites/ashford-props.png","assets/sprites/banners.png","assets/sprites/briar-crossing-gate.png","assets/sprites/combat-vfx.png","assets/sprites/control-warden-elite.png","assets/sprites/dirt-road-tiles.png","assets/sprites/hollowford-bridge.png","assets/sprites/item-icons.png","assets/sprites/millbrook-stalls.png","assets/sprites/oakwatch-fort.png","assets/sprites/patrols.png","assets/sprites/pineway-pines.png","assets/sprites/relic-guardian.png","assets/sprites/rock-debris.png","assets/sprites/scrap-beast.png","assets/sprites/sinkroot-gate.png","assets/sprites/thornferry-pier.png","assets/sprites/title-warden.png","assets/sprites/tree-clusters.png","assets/sprites/wagon.png","assets/sprites/warden.png","assets/sprites/wild-camp.png","assets/thorn.png","assets/title-bg.png","assets/wagon.png","favicon.svg","icons/icon-192.png","icons/icon-512.png","icons/maskable-512.png","index.html","manifest.webmanifest"];
const INDEX_URL = new URL("./", self.registration.scope).href;
const NET_TIMEOUT_MS = 4000;

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      // cache: "reload" bypasses the HTTP cache (GitHub Pages sends max-age=600), so we never precache stale files.
      .then((c) => c.addAll(PRECACHE.map((u) => new Request(u, { cache: "reload" }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith(PREFIX) && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (e) => {
  if (!e.source) return;
  if (e.data === "version") e.source.postMessage({ type: "sw-version", version: VERSION });
  // Page asks which index.html this SW serves, to decide whether it is already running this build.
  if (e.data === "index-html") {
    e.waitUntil(
      caches.open(CACHE).then((c) => c.match(INDEX_URL)).then((r) => (r ? r.text() : ""))
        .then((html) => e.source.postMessage({ type: "sw-index-html", version: VERSION, html })),
    );
  }
});

function isIndex(req, url) {
  return req.mode === "navigate" || url.href === INDEX_URL || url.pathname.endsWith("/index.html");
}

function networkFirstIndex(req) {
  const net = fetch(req, { cache: "no-cache" }).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(INDEX_URL, copy)); }
    return res;
  });
  const fallback = () => caches.match(INDEX_URL).then((hit) => hit || net);
  const timeout = new Promise((resolve) => setTimeout(resolve, NET_TIMEOUT_MS)).then(() => caches.match(INDEX_URL));
  return Promise.race([net.catch(fallback), timeout.then((hit) => hit || net)]).catch(fallback);
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.endsWith("/sw.js")) return; // never serve the SW itself from cache
  if (isIndex(req, url)) { e.respondWith(networkFirstIndex(req)); return; }
  e.respondWith(
    caches.match(req, { ignoreSearch: true, ignoreVary: true }).then((hit) => {
      if (hit) return hit;
      return fetch(req)
        .then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
          return res;
        })
        .catch(() => Response.error());
    }),
  );
});
