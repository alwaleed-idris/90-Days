const C='a90-v4',A=['./','index.html','manifest.webmanifest','icon.svg','icon-192.png','icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(A)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  e.respondWith(fetch(r).then(res=>{
    const u=new URL(r.url);
    if(res.ok&&(u.origin===location.origin||/fonts\.(googleapis|gstatic)\.com/.test(u.host))){const cp=res.clone();caches.open(C).then(c=>c.put(r,cp))}
    return res
  }).catch(()=>caches.match(r).then(m=>m||caches.match('./'))))
});
self.addEventListener('notificationclick',e=>{
  e.notification.close();
  e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(l=>{
    for(const c of l){if('focus' in c)return c.focus()}
    return clients.openWindow('./')
  }))
});
