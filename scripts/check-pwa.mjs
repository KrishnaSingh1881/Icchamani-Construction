import {readFile,access} from 'node:fs/promises'
import {runInNewContext} from 'node:vm'
import assert from 'node:assert/strict'

const manifest=JSON.parse(await readFile('dist/manifest.webmanifest','utf8'))
assert.equal(manifest.display,'standalone');assert.equal(manifest.start_url,'/')
for(const icon of manifest.icons){const data=await readFile(`dist${icon.src}`);assert.equal(data.readUInt32BE(16),Number(icon.sizes.split('x')[0]));assert.equal(data.readUInt32BE(20),Number(icon.sizes.split('x')[1]))}
const handlers={};const storage=new Map();const precached=[];let notification
const cache={addAll:async paths=>{for(const path of paths){await access(`dist${path==='/'?'/index.html':path}`);precached.push(path);storage.set(path,new Response(path))}},match:async path=>storage.get(path)?.clone()}
const self={location:{origin:'https://app.example'},clients:{claim:async()=>{}},registration:{showNotification:async(title,options)=>{notification={title,options}}},addEventListener:(name,handler)=>{handlers[name]=handler}}
runInNewContext(await readFile('dist/sw.js','utf8'),{self,caches:{open:async()=>cache,keys:async()=>[]},fetch:async()=>{throw new Error('Offline')},URL,Promise})
let pending;handlers.install({waitUntil:promise=>{pending=promise}});await pending
assert(precached.some(path=>path.endsWith('NotoSans-Regular.ttf')))
let response;handlers.fetch({request:{method:'GET',url:'https://app.example/work',mode:'navigate'},respondWith:promise=>{response=promise}})
assert.equal(await (await response).text(),'/')
let intercepted=false;handlers.fetch({request:{method:'GET',url:'https://supabase.example/rest/v1/business_records',mode:'cors'},respondWith:()=>{intercepted=true}});assert.equal(intercepted,false)
handlers.push({data:{json:()=>({path:'https://evil.example',body:'Review available'})},waitUntil:promise=>{pending=promise}});await pending;assert.equal(notification.options.data.path,'/notifications')
console.log('PWA checks pass: install assets exist, icons match, offline routes fall back, APIs stay uncached, push routes stay local.')
