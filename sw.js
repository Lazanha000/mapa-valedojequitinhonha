/* Cópia do site no aparelho para abrir sem internet. Sempre tenta a versão nova primeiro (rede);
   só usa a cópia guardada se a rede falhar. Endereços de fora (API do IBGE) passam direto. */
const V='jq-v10';
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(['./','index.html','style.css','app.js','favicon.svg','manifest.webmanifest','fonts/barlow-400.woff2','fonts/barlow-500.woff2','fonts/barlow-600.woff2','fonts/barlow-condensed-600.woff2','fonts/barlow-condensed-700.woff2'])));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET'||new URL(r.url).origin!==location.origin)return;
  e.respondWith(fetch(r).then(res=>{if(res.ok&&res.type==='basic'){const cp=res.clone();caches.open(V).then(c=>c.put(r,cp))}return res})
    .catch(()=>caches.match(r,{ignoreSearch:true}).then(m=>m||(r.mode==='navigate'?caches.match('./'):undefined)).then(m=>m||Response.error())))});
