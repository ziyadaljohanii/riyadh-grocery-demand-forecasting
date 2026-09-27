const CACHE='english-lab-v4';
const ASSETS=['./','./index.html','./styles.css','./data-base.js','./units-a.js','./units-b.js','./units-c.js','./data-state.js','./core-a.js','./core-b.js','./study-a.js','./study-b.js','./main-a.js','./main-b.js','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))));