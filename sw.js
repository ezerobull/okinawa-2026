// 오키나와 가족여행 · 오프라인용 서비스 워커
const V = 'okinawa-v2', TILES = 'okinawa-tiles', TMAX = 200;
const LIB = ["https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css","https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"];
const stamp = async r => { const h = new Headers(r.headers); h.set('x-cached-at', String(Date.now())); return new Response(await r.blob(), { status: r.status, statusText: r.statusText, headers: h }); };
self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(V);
    const put = async p => { try { const r = await fetch(p, { cache: 'no-cache' }); if (r.ok) await c.put(p, await stamp(r)); return r; } catch (_) {} };
    await put('./');
    try { const m = await (await fetch('parts.json', { cache: 'no-cache' })).clone().json(); await put('parts.json');
      await Promise.all(['a', 'b'].flatMap(f => Array.from({ length: m[f] }, (_, i) => put(f + '-' + i + '.txt')))); } catch (_) {}
    await Promise.all(LIB.map(async u => { try { const r = await fetch(u, { mode: 'cors', credentials: 'omit' }); if (r.ok) await c.put(u, r); } catch (_) {} }));
    self.skipWaiting();
  })());
});
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== V && k !== TILES) await caches.delete(k);
  await self.clients.claim();
})()));
async function netFirst(req, key) {
  const c = await caches.open(V);
  try { const r = await fetch(req); if (r.ok) await c.put(key, await stamp(r.clone())); return r; }
  catch (e) { return (await c.match(key)) || Response.error(); }
}
async function cacheFirst(req) {
  const c = await caches.open(V), hit = await c.match(req.url);
  if (hit) return hit;
  const r = await fetch(req); if (r.ok) await c.put(req.url, r.clone()); return r;
}
async function tile(req) {
  const c = await caches.open(TILES), hit = await c.match(req.url);
  if (hit) return hit;
  try {
    const r = await fetch(req);
    if (r.ok || r.type === 'opaque') { await c.put(req.url, r.clone()); const ks = await c.keys(); for (let i = 0; i < ks.length - TMAX; i++) await c.delete(ks[i]); }
    return r;
  } catch (e) { return Response.error(); }
}
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (u.origin === location.origin) {
    const base = new URL('./', self.registration.scope).pathname;
    const p = u.pathname.slice(base.length);
    if (p === 'parts.json' || /^[ab](-\d+)?\.txt$/.test(p)) e.respondWith(netFirst(req, p));   // 쿼리(?v=)는 무시하고 파일 이름으로 캐시
    else if (req.mode === 'navigate' || p === '' || p === 'index.html') e.respondWith(netFirst(req, './'));
    return;
  }
  if (LIB.includes(u.href)) e.respondWith(cacheFirst(req));
  else if (u.hostname === 'tile.openstreetmap.org') e.respondWith(tile(req));
});
