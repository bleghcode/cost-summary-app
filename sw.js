/* Service worker: เก็บไฟล์แอปไว้ในเครื่องให้เปิดได้ตอนออฟไลน์
   เปลี่ยนเลข VERSION ทุกครั้งที่แก้ index.html เพื่อให้เครื่องดึงของใหม่ */
const VERSION = 'v4';
const CACHE = 'tcs-app-' + VERSION;
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (e) => {
    e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((k) => k.startsWith('tcs-app-') && k !== CACHE).map((k) => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});
self.addEventListener('fetch', (e) => {
    const req = e.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);

    // ฟอนต์ Google: เก็บไว้ใช้ซ้ำตอนออฟไลน์ (ดึงของใหม่เงียบ ๆ เมื่อออนไลน์)
    if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
        e.respondWith(
            caches.open(CACHE).then((c) =>
                c.match(req).then((hit) => {
                    const net = fetch(req).then((r) => { if (r && (r.ok || r.type === 'opaque')) c.put(req, r.clone()); return r; }).catch(() => hit);
                    return hit || net;
                })
            )
        );
        return;
    }

    if (url.origin !== location.origin) return;

    // ไฟล์ของแอป: ใช้ของในเครื่องก่อน แล้วอัปเดตเบื้องหลัง
    e.respondWith(
        caches.match(req, { ignoreSearch: true }).then((hit) => {
            const net = fetch(req).then((r) => {
                if (r && r.ok) caches.open(CACHE).then((c) => c.put(req, r.clone()));
                return r;
            }).catch(() => hit || caches.match('./index.html'));
            return hit || net;
        })
    );
});
