import {readdir,readFile,writeFile} from 'node:fs/promises'
import {createHash} from 'node:crypto'

async function files(directory) {
  const entries=await readdir(directory,{withFileTypes:true})
  return (await Promise.all(entries.map(entry=>entry.isDirectory()?files(`${directory}/${entry.name}`):[`${directory}/${entry.name}`]))).flat()
}
const assets=(await files('dist')).filter(path=>!path.endsWith('/sw.js'))
const hash=createHash('sha256')
for(const path of assets)hash.update(await readFile(path))
const cache=`gaadihisaab-shell-${hash.digest('hex').slice(0,16)}`
const urls=assets.map(path=>path.replace(/^dist/,'')).concat('/')
const source=`const CACHE=${JSON.stringify(cache)};
const ASSETS=${JSON.stringify(urls)};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('gaadihisaab-shell-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('message',event=>{if(event.data?.type==='ACTIVATE_UPDATE')self.skipWaiting()});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin)return;
 if(request.mode==='navigate')event.respondWith(fetch(request).catch(()=>caches.open(CACHE).then(cache=>cache.match('/'))));
 else if(ASSETS.includes(url.pathname))event.respondWith(caches.open(CACHE).then(cache=>cache.match(url.pathname)).then(cached=>cached||fetch(request)));
});
self.addEventListener('push',event=>{
 let data={};try{data=event.data?.json()||{}}catch{}
 const path=typeof data.path==='string'&&/^\\/(reviews|notifications|work)(\\/|$)/.test(data.path)?data.path:'/notifications';
 event.waitUntil(self.registration.showNotification('GaadiHisaab',{body:typeof data.body==='string'?data.body.slice(0,180):'Your workspace has an update.',icon:'/icon-192.png',badge:'/icon-192.png',tag:typeof data.id==='string'?data.id:undefined,data:{path}}));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();const url=new URL(event.notification.data?.path||'/notifications',self.location.origin).href;
 event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(async clients=>{const client=clients.find(client=>new URL(client.url).origin===self.location.origin);if(client){await client.navigate(url);return client.focus()}return self.clients.openWindow(url)}));
});
`
await writeFile('dist/sw.js',source)
console.log('Generated versioned PWA shell; API responses and credentials are never cached by the service worker.')
