/**
 * Sherbetori i punes.
 *
 * Ruhen vetem skedaret e ndertimit, te cilet nuk ndryshojne kurre per te njejten
 * adrese, plus faqja offline. Gjithcka tjeter shkon te rrjeti.
 *
 * Arsyeja eshte e hidhur: App Router-i i merr faqet me kerkesa GET drejt te
 * njejtes adrese (me `_rsc` ose me koken `RSC`), dhe ato nuk jane navigime.
 * Nje strategji "kopja e pari" i ruante ato pergjigje, prandaj studenti postonte
 * dicka, kthehej mbrapa dhe shihte feed-in e vjeter. Pergjigjet e faqeve nuk
 * ruhen me fare.
 */

const CACHE = "studentet-ks-v3";
const OFFLINE_URL = "/offline";
const PRECACHE = [OFFLINE_URL, "/icon-192.png", "/icon-512.png"];

/** Vetem keto ruhen: skedare me emer qe permban hash-in e ndertimit. */
function isImmutableAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.endsWith(".woff2") ||
    /^\/(icon-\d+|apple-icon|icon-maskable)\.png$/.test(url.pathname)
  );
}

/** Kerkesa e nje faqeje, edhe kur vjen si te dhena per navigim brenda aplikacionit. */
function isPageRequest(request, url) {
  return (
    request.mode === "navigate" ||
    request.headers.get("RSC") === "1" ||
    request.headers.has("Next-Router-State-Tree") ||
    url.searchParams.has("_rsc") ||
    (request.headers.get("accept") || "").includes("text/html")
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (isPageRequest(request, url)) {
    // Navigimi merret gjithmone nga rrjeti. Pa internet del faqja offline, kurre
    // nje faqe e vjeter qe duket e fresket.
    if (request.mode === "navigate") {
      event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    }
    return;
  }

  if (!isImmutableAsset(url)) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok && response.type === "basic") {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    }),
  );
});
