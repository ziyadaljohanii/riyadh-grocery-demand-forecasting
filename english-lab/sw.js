const CACHE='english-lab-v11';
const ASSETS=['./','./index.html','./styles.css','./data-base.js','./units-a.js','./units-b.js','./units-c.js','./data-state.js','./core-a.js','./core-b.js','./study-a.js','./study-b.js','./main-a.js','./main-b.js','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)))});
self.addEventListener('activate',e=>e.waitUntil(Promise.all([self.clients.claim(),caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))])));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  e.respondWith(fetch(e.request).then(r=>{
    const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r
  }).catch(()=>caches.match(e.request)))
});