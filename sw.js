/* Sano — service worker: faz o app abrir sem internet e se atualizar sozinho.
   Ao publicar uma versão nova do index.html, aumente o número abaixo. */
const VERSION = 'sano-v42';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './maskable-512.png', './favicon-64.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // páginas: tenta a rede primeiro (para pegar atualizações), cai no cache sem internet
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(r => { const cp = r.clone(); caches.open(VERSION).then(c => c.put('./index.html', cp)); return r; }).catch(() => caches.match('./index.html')));
    return;
  }
  // fontes e bibliotecas externas: usa o cache e atualiza em segundo plano
  if (/fonts\.(googleapis|gstatic)\.com|www\.gstatic\.com|cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net/.test(url.host) || url.origin === location.origin) {
    e.respondWith(caches.open(VERSION).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(r => { if (r && (r.ok || r.type === 'opaque')) c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
  }
});
