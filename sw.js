// 예전 주소의 서비스 워커를 대신함: 캐시 지우고 스스로 해제 → 열린 창은 새 주소로
const TO = "https://trips.oki-trip-2026.workers.dev/okinawa-2026/";
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) await caches.delete(k);
  await self.registration.unregister();
  for (const c of await self.clients.matchAll({ type: 'window', includeUncontrolled: true })) {
    try { const u = new URL(c.url); await c.navigate(TO + u.search + u.hash); } catch (_) {}
  }
})()));
