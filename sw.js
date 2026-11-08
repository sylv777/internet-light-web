// Offline shell: precache the app on install so it opens with no internet.
const C = 'il-shell-v5';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'apple-touch-icon.png', 'icon-192.png'];
async function precache() {
  const c = await caches.open(C);
  await Promise.all(SHELL.map(u => fetch(u, { cache: 'reload' }).then(r => r.ok && c.put(u, r)).catch(() => {})));
  try {
    const html = await (await c.match('./')).text();
    const assets = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css|png|ico|svg|ttf|woff2?))"/g)].map(m => m[1]);
    await Promise.all(assets.map(u => fetch(u, { cache: 'reload' }).then(r => r.ok && c.put(u, r)).catch(() => {})));
  } catch {}
}
self.addEventListener('install', (e) => { self.skipWaiting(); e.waitUntil(precache()); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== self.location.origin) return;
  e.respondWith((async () => {
    try {
      const res = await fetch(r, { cache: 'no-cache' });
      if (res.ok) { const c = res.clone(); caches.open(C).then(x => x.put(r, c)); }
      return res;
    } catch {
      const hit = await caches.match(r, { ignoreSearch: true });
      if (hit) return hit;
      if (r.mode === 'navigate') {
        const shell = (await caches.match('./')) || (await caches.match('index.html'));
        if (shell) return shell;
      }
      return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
    }
  })());
});
