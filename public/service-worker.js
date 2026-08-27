try {
  importScripts("./runtime-precache-manifest.js");
} catch {
  // Development output has no final static-build manifest.
}

const FALLBACK_CACHE_NAME = "simex-dashboard-v3-step8-v1";
const FALLBACK_CORE_ASSETS = [
  "./",
  "./index.html",
  "./source-viewer.html",
  "./manifest.webmanifest",
  "./service-worker.js",
  "./portable-dashboard-data.js",
  "./assets/pdpc-mark.png",
  "./assets/pwa-icon.svg",
  "./config/dashboard.json",
  "./config/dataset-profiles.json",
  "./data/data-sources.generated.json",
  "./integration/quorum-chart-catalogue.json",
  "./vendor/three.min.js",
  "./vendor/vanta.net.min.js",
];
const generatedManifest = self.__SIMEX_RUNTIME_PRECACHE_MANIFEST__;
const CACHE_NAME = generatedManifest?.cacheName ?? FALLBACK_CACHE_NAME;
const CORE_ASSETS = generatedManifest?.assets ?? FALLBACK_CORE_ASSETS;

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const builtAssets = new Set(CORE_ASSETS);
    if (!generatedManifest) {
      for (const entrypoint of ["./index.html", "./source-viewer.html"]) {
        try {
          const response = await fetch(entrypoint, { cache: "reload" });
          if (!response.ok) continue;
          const html = await response.text();
          for (const url of htmlRuntimeUrls(html)) builtAssets.add(url);
        } catch {
          // cache.addAll below provides the authoritative install failure.
        }
      }
    }
    await cache.addAll([...builtAssets]);
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key.startsWith("simex-dashboard-") && key !== CACHE_NAME)
        .map((key) => caches.delete(key)),
    );
  })());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;
  const navigation = event.request.mode === "navigate"
    || requestUrl.pathname.endsWith("/index.html");
  if (navigation) {
    event.respondWith(networkFirstNavigation(event.request));
    return;
  }
  event.respondWith(cacheFirstAsset(event.request));
});

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    return (await caches.match(request))
      ?? (await caches.match("./index.html"))
      ?? offlineResponse("Offline application shell unavailable");
  }
}

async function cacheFirstAsset(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request, { ignoreVary: true });
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    return offlineResponse("Offline asset unavailable");
  }
}

function offlineResponse(message) {
  return new Response(message, {
    status: 503,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

function htmlRuntimeUrls(html) {
  const urls = [];
  for (const match of html.matchAll(/\b(?:href|src)\s*=\s*["']([^"']+)["']/gi)) {
    const url = match[1];
    if (/^\.\//.test(url) && /\.(?:css|js)(?:[?#].*)?$/i.test(url)) {
      urls.push(url.split(/[?#]/, 1)[0]);
    }
  }
  return urls;
}
