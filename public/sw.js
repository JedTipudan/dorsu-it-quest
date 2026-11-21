/* DOrSU IT Quest service worker
 * - Static build assets: cache-first (they are content-hashed)
 * - Images / icons / fonts: stale-while-revalidate
 * - Pages: network-first, falling back to the offline page.
 *   Authenticated HTML is intentionally NOT cached: students often share
 *   lab computers, so one student's data must never be served to another.
 */
const VERSION = 'itq-v1'
const STATIC_CACHE = `${VERSION}-static`
const RUNTIME_CACHE = `${VERSION}-runtime`
const OFFLINE_URL = '/offline'
const PRECACHE = [OFFLINE_URL, '/icons/logo.svg', '/icons/icon-192.png', '/icons/icon-512.png', '/manifest.webmanifest']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return // Supabase & other APIs: always live

  // Page navigations → network first, offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => (await caches.match(OFFLINE_URL)) || Response.error()),
    )
    return
  }

  // Immutable Next.js build assets → cache first
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((hit) =>
        hit || fetch(request).then((res) => {
          if (res.ok) {
            const copy = res.clone()
            caches.open(STATIC_CACHE).then((c) => c.put(request, copy))
          }
          return res
        }),
      ),
    )
    return
  }

  // Icons, images, fonts → stale-while-revalidate
  if (/\.(?:png|jpg|jpeg|svg|webp|gif|ico|woff2?)$/.test(url.pathname) || url.pathname.startsWith('/_next/image')) {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then(async (cache) => {
        const hit = await cache.match(request)
        const network = fetch(request)
          .then((res) => {
            if (res.ok) cache.put(request, res.clone())
            return res
          })
          .catch(() => hit)
        return hit || network
      }),
    )
  }
})
